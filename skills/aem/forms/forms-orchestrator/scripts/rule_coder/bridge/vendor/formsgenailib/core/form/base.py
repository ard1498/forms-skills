import json
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Literal, Optional, Union


@dataclass
class Field:
    """A general purpose container to represent a form field with its properties"""

    id: str
    name: str
    fieldType: str
    label: str

    # Derived Properties
    path: Optional[str] = None
    symbolicName: Optional[str] = None
    enum: Optional[List[str]] = None
    enumNames: Optional[List[str]] = None

    # Raw Data
    _raw_source: Optional[Literal["jcr", "crispr", "foundation"]] = None
    _raw: dict = None


@dataclass
class Panel:
    """A general purpose container to represent a form panel with its properties"""

    id: str
    name: str
    fieldType: str
    label: str
    items: List[Union["Panel", Field]]

    # Derived Properties
    path: Optional[str] = None
    symbolicName: Optional[str] = None

    # Raw Data
    _raw_source: Optional[Literal["jcr", "crispr", "guidejson"]] = None
    _raw: dict = None


class BaseForm(ABC):
    """Abstract base class for all form types"""

    def __init__(self, form: Union[dict, str]):
        if isinstance(form, str):
            self.form_dict = json.loads(form)
        elif isinstance(form, dict):
            self.form_dict = form
        else:
            raise ValueError("Form must be either a JSON string or dictionary")

        self._panels: List[Panel] = []
        self._fields: List[Union[Field, Panel]] = []
        self._parse_form()

    @abstractmethod
    def _parse_form(self) -> None:
        """Parse the form JSON into internal structure"""
        pass

    @abstractmethod
    def flatten(self) -> List[dict]:
        """Convert form to a flat structure suitable for LLM processing"""
        pass
