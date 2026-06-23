from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import json
import re

ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "src" / "Equipment Configurator.xlsx"
OUTPUT = ROOT / "docs" / "questions.json"

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def slug(value):
    value = str(value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_") or "option"


def col_index(cell_ref):
    letters = "".join(ch for ch in cell_ref if ch.isalpha())
    number = 0
    for ch in letters:
        number = number * 26 + ord(ch.upper()) - 64
    return number - 1


def read_rows(path):
    with ZipFile(path) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("a:si", NS):
                shared.append("".join(text.text or "" for text in item.findall(".//a:t", NS)))

        sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        rows = []
        for row in sheet.findall(".//a:sheetData/a:row", NS):
            values = []
            for cell in row.findall("a:c", NS):
                idx = col_index(cell.attrib.get("r", "A1"))
                while len(values) <= idx:
                    values.append(None)

                value = None
                if cell.attrib.get("t") == "inlineStr":
                    value = "".join(text.text or "" for text in cell.findall(".//a:t", NS))
                else:
                    raw = cell.find("a:v", NS)
                    if raw is not None:
                        value = shared[int(raw.text)] if cell.attrib.get("t") == "s" else raw.text

                values[idx] = value

            while values and values[-1] is None:
                values.pop()
            if values:
                rows.append(values)

        return rows


def cell(row, index):
    return row[index] if index < len(row) else None


def collect_options(rows, column_index):
    options = []
    seen = set()
    for row in rows[4:10]:
        value = cell(row, column_index)
        if value and value not in seen:
            seen.add(value)
            options.append({"id": slug(value), "text": value})
    return options


def with_images(question_id, options):
    image_by_text = {
        "direct product on belt": "images/Ultrasonic drag blade.png",
        "peelboards": "images/waterjet.png",
        "fluted pans": "images/Ultrasonic plunge blade.png",
        "flat pans": "images/Ultrasonic drag blade.png",
        "ultrasonic drag blade": "images/Ultrasonic drag blade.png",
        "ultrasonic plunge blade": "images/Ultrasonic plunge blade.png",
        "waterjet tool": "images/waterjet.png",
        "custom tool": "images/test.png",
    }

    for option in options:
        image = image_by_text.get(option["text"].lower())
        if image:
            option["image"] = image
        if question_id == "product_settings" and "deep cuts" in option["text"].lower():
            option["tags"] = ["Limits waterjet"]
    return options


def build_config(rows):
    info_row = rows[2]
    question_row = rows[3]
    recommended_row = rows[4]
    recommendation_text = cell(recommended_row, 9) or "Recommended configuration"
    scope_text = cell(recommended_row, 10) or ""
    scope = [line.strip("- ").strip() for line in scope_text.splitlines() if line.strip()]

    question_specs = [
        ("support", "Q1", 1, "single", "image"),
        ("product_settings", "Q2", 2, "multi", "list"),
        ("tool_options", "Q3", 3, "multi", "image"),
        ("production_rate", "Q4", 4, "range", None),
        ("conveyor_width", "Q5", 5, "single", "list"),
    ]

    questions = []
    for question_id, excel_column, column_index, q_type, display in question_specs:
        question = {
            "id": question_id,
            "excelColumn": excel_column,
            "text": cell(question_row, column_index),
            "info": cell(info_row, column_index),
            "type": q_type,
            "required": True,
        }
        if display:
            question["display"] = display

        if q_type == "range":
            question.update(
                {
                    "min": 20,
                    "max": 2000,
                    "step": 10,
                    "defaultValue": 80,
                    "unit": "cuts/min",
                    "options": [{"id": "between_20_and_2000", "text": cell(recommended_row, column_index)}],
                }
            )
        else:
            question["options"] = with_images(question_id, collect_options(rows, column_index))
            for option in question["options"]:
                option["info"] = question["info"]

        questions.append(question)

    conditional_rules = [
        {
            "id": "deep-cuts-disable-waterjet",
            "sourceQuestionId": "product_settings",
            "sourceOptionId": "deep_cuts_5mm",
            "targetQuestionId": "tool_options",
            "targetOptionId": "waterjet_tool",
            "effect": "disable",
            "message": "Waterjet tool is not available when deep cuts (>5mm) are selected.",
        }
    ]

    recommendations = [
        {
            "id": slug(recommendation_text),
            "name": recommendation_text,
            "sku": "KATANA-II-DRAG-1R",
            "image": "images/Ultrasonic drag blade.png",
            "recommendedOption": recommendation_text,
            "numberOfRobots": cell(recommended_row, 7),
            "scoringPatternComplexity": cell(recommended_row, 8),
            "description": "Dynamic fit calculated from workbook-derived scoring rules.",
            "scopeLimitations": scope,
            "rules": [
                {
                    "questionId": "tool_options",
                    "operator": "includes",
                    "value": "ultrasonic_drag_blade",
                    "score": 40,
                    "label": "Ultrasonic drag blade selected",
                },
                {
                    "questionId": "conveyor_width",
                    "operator": "equals",
                    "value": "less_than_48_inches",
                    "score": 25,
                    "label": "Conveyor width is less than 48 inches",
                },
                {
                    "questionId": "production_rate",
                    "operator": "lte",
                    "value": 80,
                    "score": 25,
                    "label": "Production rate fits 80 cuts/min maximum",
                },
                {
                    "questionId": "product_settings",
                    "operator": "includesAny",
                    "value": ["inclusions_with_big_seeds_sunflower_etc", "highly_floured_products_or_belt"],
                    "score": 10,
                    "label": "Product characteristics fit drag blade strengths",
                },
            ],
            "disqualifiers": [
                {
                    "questionId": "tool_options",
                    "operator": "includes",
                    "value": "waterjet_tool",
                    "message": "This recommendation is for an ultrasonic drag blade, not waterjet.",
                }
            ],
        }
    ]

    return {
        "sourceWorkbook": str(WORKBOOK.relative_to(ROOT)).replace("\\", "/"),
        "questions": questions,
        "conditionalRules": conditional_rules,
        "recommendations": recommendations,
    }


if __name__ == "__main__":
    if not WORKBOOK.exists():
        raise SystemExit(f"Workbook not found: {WORKBOOK}")

    config = build_config(read_rows(WORKBOOK))
    OUTPUT.write_text(json.dumps(config, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT}")
