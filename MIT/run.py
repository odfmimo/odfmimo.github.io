import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), 'manga-image-translator'))

from flask import Flask, request, Response, jsonify, render_template, session, send_file, render_template_string
import json
import numpy as np
import shutil
from PIL import Image
import traceback

from argparse import Namespace

from manga_translator.manga_translator import MangaTranslator
from manga_translator.args import parser, reparse
from manga_translator.config import Detector, Ocr, Translator
from manga_translator import Config
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
from manga_translator.utils import TextBlock, Quadrilateral, det_rearrange_forward

class ComplexEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.generic): return obj.item()
        if isinstance(obj, np.ndarray): return obj.tolist()
        return json.JSONEncoder.default(self, obj)

async def _detect(image, config=None):    
    args, unknown = parser.parse_known_args(['ws', '--use-gpu'])
    args = Namespace(**{**vars(args), **vars(reparse(unknown))})
    args_dict = vars(args)

    translator = MangaTranslator(args_dict)

    ctx = Context()
    ctx.input = image
    ctx.result = None

    config = Config(**config) if config else Config()
    translator._set_image_context(config, image)

    ctx.img_colorized = ctx.input
    ctx.upscaled = ctx.img_colorized

    ctx.img_rgb, ctx.img_alpha = load_image(ctx.upscaled)
    ctx.textlines, ctx.mask_raw, ctx.mask = await translator._run_detection(config, ctx)
    ctx.textlines = await translator._run_ocr(config, ctx)
    ctx.text_regions = await translator._run_textline_merge(config, ctx)

    text_regions = []
    for text_region in ctx.text_regions:
        xyxy = text_region.xyxy.tolist()
        lines = text_region.lines.tolist()
        text_regions.append({'xyxy': xyxy, 'xywh': [xyxy[0], xyxy[1], xyxy[2] - xyxy[0] + 1, xyxy[3] - xyxy[1] + 1], 'lines': lines})

    return text_regions

async def _recognize(image, config=None):
    args, unknown = parser.parse_known_args(['ws', '--use-gpu'])
    args = Namespace(**{**vars(args), **vars(reparse(unknown))})
    args_dict = vars(args)

    translator = MangaTranslator(args_dict)

    ctx = Context()
    ctx.input = image
    ctx.result = None

    config = Config(**config) if config else Config()
    translator._set_image_context(config, image)

    ctx.img_colorized = ctx.input
    ctx.upscaled = ctx.img_colorized
    
    width, height = image.size

    ctx.img_rgb, ctx.img_alpha = load_image(ctx.upscaled)
    ctx.textlines = [Quadrilateral([[0, 0], [width-1, 0], [width-1, height-1], [0, height-1]], '', 1)]
    ctx.textlines = await translator._run_ocr(config, ctx)

    if len(ctx.textlines) == 1:
        return {'text': ctx.textlines[0].text, 'font_size': float(ctx.textlines[0].font_size), 'font_color': [int(ctx.textlines[0].fg_r), int(ctx.textlines[0].fg_g), int(ctx.textlines[0].fg_b)]}
    else: return {}

async def _translate(texts, config=None):
    args, unknown = parser.parse_known_args(['ws', '--use-gpu'])
    args = Namespace(**{**vars(args), **vars(reparse(unknown))})
    args_dict = vars(args)

    translator = MangaTranslator(args_dict)
    
    ctx = Context()

    if config == None: config = {}
    if 'translator' not in config:
        config['translator'] = {}
    if 'target_lang' not in config['translator']:
        config['translator']['target_lang'] = "KOR"
    config = Config(**config)
    
    ctx.text_regions = [TextBlock([], [text]) for text in texts]
    ctx.text_regions = await translator._run_text_translation(config, ctx)

    results = []
    for text_region in ctx.text_regions:
        print(vars(text_region))
        results.append({"text": text_region.text, "result": text_region.translation})

    return results

with open(os.path.join(os.path.dirname(os.path.realpath(__file__)), 'index.html'), 'r', encoding='utf-8') as f:
    html = f.read()

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

@app.route('/')
def home():
    return render_template_string(html, OCRS=[ocr.value for ocr in Ocr], DETECTORS=[detector.value for detector in Detector], TRANSLATORS=[translator.value for translator in Translator])

@app.route('/detect', methods=['POST'])
async def detect():
    try:
        config = json.loads(data) if (data := request.values.get('config')) else None
        img = Image.open(request.files['file'])
        return await _detect(img, config)
    except:
        traceback.print_exc()
        return {}

@app.route('/recognize', methods=['POST'])
async def recognize():
    try:
        config = json.loads(data) if (data := request.values.get('config')) else None
        img = Image.open(request.files['file'])
        return await _recognize(img, config)
    except:
        traceback.print_exc()
        return {}

@app.route('/translate', methods=['POST'])
async def translate():
    try:
        config = json.loads(data) if (data := request.values.get('config')) else None
        texts = json.loads(request.values['texts'])
        return await _translate(texts, config)
    except:
        traceback.print_exc()
        return {}

if __name__ == '__main__':
    app.run('0.0.0.0', port=5000)
