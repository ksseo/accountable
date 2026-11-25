"""Features import each other one way, so there are no cycles (docs/spec.md, "How
the code is laid out"). The frontend's imports.test.ts checks its side."""

import ast
from pathlib import Path

import accountable.crm

CRM = Path(accountable.crm.__file__).parent

MAY_USE = {
    "activities": set(),
    "organizations": set(),
    "contacts": {"activities", "organizations"},
    "deals": {"activities", "organizations", "contacts"},
    "pipeline": {"deals"},
    "dashboard": {"activities", "deals"},
}
# Shared files that gather the features, so no feature may use them.
GATHERERS = {"router", "sample", "bulk"}

PREFIX = "accountable.crm"


def imported(path: Path) -> set[str]:
    """The names right under accountable.crm that a file imports."""
    found = set()
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.ImportFrom):
            assert node.level == 0, f"{path.name} has a relative import"
            # from accountable.crm import deals, or from accountable.crm.deals import repo
            modules = [f"{node.module}.{alias.name}" for alias in node.names]
        elif isinstance(node, ast.Import):
            modules = [alias.name for alias in node.names]
        else:
            continue
        found |= {m.removeprefix(f"{PREFIX}.").split(".")[0] for m in modules if m.startswith(f"{PREFIX}.")}
    return found


def test_every_feature_is_listed() -> None:
    folders = {path.parent.name for path in CRM.glob("*/*.py")}
    assert folders == set(MAY_USE)


def test_imports_between_features_go_one_way() -> None:
    forbidden = []
    for path in sorted(CRM.rglob("*.py")):
        relative = path.relative_to(CRM)
        used = imported(path)
        if len(relative.parts) == 1:
            allowed = set(MAY_USE) if path.stem in GATHERERS else set()
            banned = used & (set(MAY_USE) - allowed)
        else:
            feature = relative.parts[0]
            banned = used & ((set(MAY_USE) | GATHERERS) - {feature} - MAY_USE[feature])
        forbidden += [f"{relative.as_posix()} uses {name}" for name in sorted(banned)]
    assert forbidden == []
