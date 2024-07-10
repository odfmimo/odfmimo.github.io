import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), 'manga-image-translator-main'))

from flask import Flask, request, Response, jsonify, render_template, session, send_file, render_template_string
import json
import numpy as np
import shutil
from PIL import Image

from manga_translator.args import parser
from manga_translator.manga_translator import MangaTranslator
from manga_translator.utils import (
    BASE_PATH,
    LANGUAGE_ORIENTATION_PRESETS,
    ModelWrapper,
    Context,
    PriorityLock,
    load_image,
    dump_image,
    replace_prefix,
    visualize_textblocks,
    add_file_logger,
    remove_file_logger,
    is_valuable_text,
    rgb2hex,
    hex2rgb,
    get_color_name,
    natural_sort,
    sort_regions,
)

from manga_translator.detection import DETECTORS, dispatch as dispatch_detection, prepare as prepare_detection
from manga_translator.upscaling import dispatch as dispatch_upscaling, prepare as prepare_upscaling, UPSCALERS
from manga_translator.ocr import OCRS, dispatch as dispatch_ocr, prepare as prepare_ocr
from manga_translator.textline_merge import dispatch as dispatch_textline_merge
from manga_translator.mask_refinement import dispatch as dispatch_mask_refinement
from manga_translator.inpainting import INPAINTERS, dispatch as dispatch_inpainting, prepare as prepare_inpainting
from manga_translator.translators import (
    TRANSLATORS,
    VALID_LANGUAGES,
    LANGDETECT_MAP,
    LanguageUnsupportedException,
    TranslatorChain,
    dispatch as dispatch_translation,
    prepare as prepare_translation,
)
from manga_translator.colorization import dispatch as dispatch_colorization, prepare as prepare_colorization
from manga_translator.rendering import dispatch as dispatch_rendering, dispatch_eng_render
from manga_translator.save import save_result

from manga_translator.utils import TextBlock, Quadrilateral, det_rearrange_forward

async def main():
    args = parser.parse_args(['--target-lang=KOR', '--inpainter=none', '--use-gpu'])
    args_dict = vars(args)
    translator = MangaTranslator(args_dict)

    path = r''
    dest = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'temp.png')
    
    params = args_dict
    ctx = Context(**params)
    translator._preprocess_params(ctx)

    img = Image.open(path)
    ctx.input = img
    ctx.result = None

    ctx.img_colorized = ctx.input
    ctx.upscaled = ctx.img_colorized

    ctx.img_rgb, ctx.img_alpha = load_image(ctx.upscaled)
    ctx.textlines, ctx.mask_raw, ctx.mask = await translator._run_detection(ctx)
    ctx.textlines = await translator._run_ocr(ctx)
    ctx.text_regions = await translator._run_textline_merge(ctx)
    ctx.text_regions = await translator._run_text_translation(ctx)
    await translator._revert_upscale(ctx)

    #os.remove(dest)

class ComplexEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.generic): return obj.item()
        if isinstance(obj, np.ndarray): return obj.tolist()
        return json.JSONEncoder.default(self, obj)

async def _detect(img, args=None):
    args = parser.parse_args(['--target-lang=KOR', '--inpainter=none', '--use-gpu'] + (args or []))
    args_dict = vars(args)
    translator = MangaTranslator(args_dict)
    
    params = args_dict
    ctx = Context(**params)
    translator._preprocess_params(ctx)

    ctx.input = img
    ctx.result = None

    ctx.img_colorized = ctx.input
    ctx.upscaled = ctx.img_colorized

    ctx.img_rgb, ctx.img_alpha = load_image(ctx.upscaled)
    ctx.textlines, _, _ = await translator._run_detection(ctx)
    ctx.textlines = await translator._run_ocr(ctx)
    ctx.text_regions = await translator._run_textline_merge(ctx)

    text_regions = []
    for text_region in ctx.text_regions:
        xyxy = text_region.xyxy.tolist()
        lines = text_region.lines.tolist()
        text_regions.append({'xyxy': xyxy, 'xywh': [xyxy[0], xyxy[1], xyxy[2] - xyxy[0] + 1, xyxy[3] - xyxy[1] + 1], 'lines': lines})

    return text_regions

async def _recognize(img, args=None):
    args = parser.parse_args(['--target-lang=KOR', '--inpainter=none', '--use-gpu'] + (args or []))
    args_dict = vars(args)
    translator = MangaTranslator(args_dict)
    
    params = args_dict
    ctx = Context(**params)
    translator._preprocess_params(ctx)

    ctx.input = img
    ctx.result = None
    width, height = img.size

    ctx.img_colorized = ctx.input
    ctx.upscaled = ctx.img_colorized

    ctx.img_rgb, ctx.img_alpha = load_image(ctx.upscaled)
    ctx.textlines = [Quadrilateral([[0, 0], [width-1, 0], [width-1, height-1], [0, height-1]], '', 1)]
    ctx.textlines = await translator._run_ocr(ctx)

    shutil.rmtree('result')

    if len(ctx.textlines) == 1:
        return {'text': ctx.textlines[0].text, 'font_size': float(ctx.textlines[0].font_size), 'font_color': [int(ctx.textlines[0].fg_r), int(ctx.textlines[0].fg_g), int(ctx.textlines[0].fg_b)]}
    else: return {}

async def _translate(texts, args=None):
    args = parser.parse_args(['--target-lang=KOR', '--inpainter=none', '--use-gpu', '--translator=papago'] + (args or []))
    args_dict = vars(args)
    translator = MangaTranslator(args_dict)
    
    params = args_dict
    ctx = Context(**params)
    translator._preprocess_params(ctx)
    
    ctx.text_regions = [TextBlock([], [text]) for text in texts]
    ctx.text_regions = await translator._run_text_translation(ctx)

    results = []
    for text_region in ctx.text_regions:
        print(vars(text_region))
        results.append({"result": text_region.translation})

    return results

with open(os.path.join(os.path.dirname(os.path.realpath(__file__)), 'index.html'), 'r', encoding='utf-8') as f:
    html = f.read()

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

@app.route('/')
def home():
    return render_template_string(html, OCRS=list(OCRS.keys()), DETECTORS=list(DETECTORS.keys()), TRANSLATORS=list(TRANSLATORS.keys()))

@app.route('/detect', methods=['POST'])
async def detect():
    img = Image.open(request.files['file'])
    return await _detect(img)

@app.route('/recognize', methods=['POST'])
async def recognize():
    img = Image.open(request.files['file'])
    return await _recognize(img)

@app.route('/translate', methods=['POST'])
async def translate():
    texts = json.loads(request.values['texts'])
    return await _translate(texts)

if __name__ == '__main__':
    app.run('0.0.0.0', port=5000)