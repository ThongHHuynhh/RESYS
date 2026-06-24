from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import json
import re

ROOT = Path(__file__).resolve().parents[1]
WORKBOOK_CANDIDATES = [
    ROOT / "Equipment Configurator (1).xlsx",
    ROOT / "src" / "Equipment Configurator.xlsx",
]
WORKBOOK = next((path for path in WORKBOOK_CANDIDATES if path.exists()), WORKBOOK_CANDIDATES[-1])
OUTPUT = ROOT / "docs" / "questions.json"

TOOL_CAPACITY = {
    "ultrasonic_drag_blade": {
        "label": "Ultrasonic drag blade",
        "maxCutsPerMinute": 120,
        "source": "Katana II customer presentation: ultrasonic drag blade scoring rate up to 120 cuts/min",
    },
    "ultrasonic_plunge_blade": {
        "label": "Ultrasonic plunge blade",
        "maxCutsPerMinute": 200,
        "source": "Katana II customer presentation: ultrasonic plunge blade scoring rate up to 200 cuts/min",
    },
    "waterjet_tool": {
        "label": "Waterjet tool",
        "maxCutsPerMinute": 600,
        "perNozzleCutsPerMinute": 120,
        "maxNozzles": 5,
        "source": "Katana II customer presentation: 120 cuts/min per head, 600 cuts/min per tool",
    },
    "custom_tool": {
        "label": "Custom tool",
        "maxCutsPerMinute": 2000,
        "source": "Custom engineering review required",
    },
}

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
    images_by_question = {
        "support": {
            "direct product on belt": "images/Direct product on belt.png",
            "peelboards": "images/Peelboard.png",
            "fluted pans": "images/Fluted tray.png",
            "flat pans": "images/Flat tray.png",
        },
        "tool_options": {
            "ultrasonic drag blade": "images/Ultrasonic drag blade.png",
            "ultrasonic plunge blade": "images/Ultrasonic plunge blade.png",
            "waterjet tool": "images/waterjet.png",
            "custom tool": "images/test.png",
        },
    }
    image_by_text = images_by_question.get(question_id, {})

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
    scope = [
        "120 cuts/min scoring rate from the Katana II customer presentation; 80 cuts/min workbook planning point for simple parallel cuts"
        if "80 cuts/min max" in item
        else item
        for item in scope
    ]

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
                    "capacityQuestionId": "tool_options",
                    "capacityByTool": TOOL_CAPACITY,
                    "waterjetNozzleControl": {
                        "answerId": "waterjet_nozzles",
                        "label": "Waterjet nozzles",
                        "min": 1,
                        "max": 5,
                        "defaultValue": 1,
                        "perNozzleCutsPerMinute": 120,
                        "maxCutsPerMinute": 600,
                    },
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
                    "value": 120,
                    "score": 25,
                    "label": "Production rate fits 120 cuts/min drag-blade maximum",
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
        ,
        {
            "id": "1_robot_with_plunge_blade",
            "name": "1 robot with plunge blade",
            "sku": "KATANA-II-PLUNGE-1R",
            "image": "images/Ultrasonic plunge blade.png",
            "recommendedOption": "1 robot with plunge blade",
            "numberOfRobots": cell(recommended_row, 7),
            "scoringPatternComplexity": "Multiple parallel cuts",
            "description": "Ultrasonic plunge recommendation for repeatable straight or parallel scoring patterns.",
            "scopeLimitations": [
                "Uses ultrasonic plunge tooling for consistent straight cuts",
                "200 cuts/min scoring rate from the Katana II customer presentation",
                "Best fit for products that benefit from ultrasonic scoring without waterjet",
            ],
            "rules": [
                {
                    "questionId": "tool_options",
                    "operator": "includes",
                    "value": "ultrasonic_plunge_blade",
                    "score": 40,
                    "label": "Ultrasonic plunge blade selected",
                },
                {
                    "questionId": "production_rate",
                    "operator": "lte",
                    "value": 200,
                    "score": 25,
                    "label": "Production rate fits 200 cuts/min plunge-blade maximum",
                },
                {
                    "questionId": "product_settings",
                    "operator": "includesAny",
                    "value": ["highly_hydrated_dough_65_water", "very_light_products_50g"],
                    "score": 15,
                    "label": "Product characteristics fit ultrasonic plunge scoring",
                },
            ],
            "disqualifiers": [
                {
                    "questionId": "tool_options",
                    "operator": "includes",
                    "value": "waterjet_tool",
                    "message": "This recommendation is for an ultrasonic plunge blade, not waterjet.",
                }
            ],
        },
        {
            "id": "waterjet_scoring_tool",
            "name": "Waterjet scoring tool",
            "sku": "KATANA-II-WATERJET",
            "image": "images/waterjet.png",
            "recommendedOption": "Waterjet scoring tool",
            "numberOfRobots": "Single or double cell depending on conveyor width",
            "scoringPatternComplexity": "Cross and complex scoring patterns",
            "description": "Waterjet recommendation with capacity calculated from the selected nozzle count.",
            "scopeLimitations": [
                "120 cuts/min per nozzle/head",
                "600 cuts/min maximum per waterjet tool",
                "Not available for deep cuts greater than 5 mm",
                "Requires pump system and waterjet utility review",
            ],
            "rules": [
                {
                    "questionId": "tool_options",
                    "operator": "includes",
                    "value": "waterjet_tool",
                    "score": 45,
                    "label": "Waterjet tool selected",
                },
                {
                    "questionId": "production_rate",
                    "operator": "lteDynamicCapacity",
                    "capacityQuestionId": "tool_options",
                    "toolId": "waterjet_tool",
                    "nozzleAnswerId": "waterjet_nozzles",
                    "perNozzleCutsPerMinute": 120,
                    "maxCutsPerMinute": 600,
                    "score": 30,
                    "label": "Production rate fits selected waterjet nozzle capacity",
                },
                {
                    "questionId": "product_settings",
                    "operator": "notIncludes",
                    "value": "deep_cuts_5mm",
                    "score": 20,
                    "label": "No deep-cut constraint blocking waterjet",
                },
            ],
            "disqualifiers": [
                {
                    "questionId": "product_settings",
                    "operator": "includes",
                    "value": "deep_cuts_5mm",
                    "message": "Waterjet is not available when deep cuts (>5mm) are selected.",
                },
                {
                    "questionId": "production_rate",
                    "operator": "gtDynamicCapacity",
                    "capacityQuestionId": "tool_options",
                    "toolId": "waterjet_tool",
                    "nozzleAnswerId": "waterjet_nozzles",
                    "perNozzleCutsPerMinute": 120,
                    "maxCutsPerMinute": 600,
                    "message": "Requested cutting rate is above the selected waterjet nozzle capacity.",
                }
            ],
        },
        {
            "id": "custom_scoring_tool",
            "name": "Custom scoring tool",
            "sku": "KATANA-II-CUSTOM",
            "image": "images/test.png",
            "recommendedOption": "Custom scoring tool",
            "numberOfRobots": "Engineering review",
            "scoringPatternComplexity": "Custom square, star, polka, or special patterns",
            "description": "Custom recommendation for patterns or rates outside standard tool limits.",
            "scopeLimitations": [
                "Requires application engineering review",
                "Use when the requested rate, support, or scoring pattern exceeds standard tool limits",
            ],
            "baseScore": 5,
            "rules": [
                {
                    "questionId": "tool_options",
                    "operator": "includes",
                    "value": "custom_tool",
                    "score": 45,
                    "label": "Custom tool selected",
                },
                {
                    "questionId": "production_rate",
                    "operator": "gte",
                    "value": 610,
                    "score": 20,
                    "label": "Requested rate is above standard waterjet tool capacity",
                },
                {
                    "questionId": "conveyor_width",
                    "operator": "equals",
                    "value": "more_than_60_inches",
                    "score": 15,
                    "label": "Wide conveyor may need a custom cell layout",
                },
            ],
        },
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
