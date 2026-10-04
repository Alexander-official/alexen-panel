"""A host's groups are stored in hosts.group_name as "a, b, c"."""
from typing import Iterable, List, Optional


def split_groups(value: Optional[str]) -> List[str]:
    out = []
    for part in (value or "").split(","):
        name = part.strip()
        if name and name not in out:
            out.append(name)
    return out


def join_groups(names: Iterable[str]) -> Optional[str]:
    names = split_groups(",".join(names))
    return ", ".join(names) if names else None
