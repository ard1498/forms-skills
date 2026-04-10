from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict
from pydantic import Field as PydanticField
from pydantic import model_validator

from .base import BaseForm, Field, Panel


class CoreComponentLabel(BaseModel):
    """Model for label objects in Core Components"""

    value: str
    richText: Optional[bool] = False


class CoreComponentConstraintMessages(BaseModel):
    """Model for validation constraint messages"""

    minLength: Optional[str] = None
    maxLength: Optional[str] = None
    required: Optional[str] = None
    format: Optional[str] = None
    pattern: Optional[str] = None


class CoreComponentBase(BaseModel):
    """Base model for all Core Components"""

    name: str
    fieldType: str
    id: Optional[str] = None
    label: Optional[Union[CoreComponentLabel, str]] = None
    description: Optional[str] = None
    screenReaderText: Optional[str] = None
    properties: Optional[Any] = None
    events: Optional[Any] = None
    rules: Optional[Any] = None
    colon_type: Optional[str] = PydanticField(None, alias=":type")

    def label_str(self) -> Optional[str]:
        if isinstance(self.label, CoreComponentLabel):
            return self.label.value
        return self.label

    model_config = ConfigDict(populate_by_name=True)


class CoreComponentField(CoreComponentBase):
    """Model for Core Component fields"""

    type: Optional[str] = None
    default: Optional[Any] = None
    minLength: Optional[int] = None
    maxLength: Optional[int] = None
    required: Optional[bool] = None
    format: Optional[str] = None
    pattern: Optional[str] = None
    enum: Optional[List[Any]] = None
    enumNames: Optional[List[Any]] = None
    constraintMessages: Optional[CoreComponentConstraintMessages] = None
    mandatory_message: Optional[str] = PydanticField(None, alias="mandatoryMessage")
    tooltip: Optional[str] = None
    placeholder: Optional[str] = None
    enabled: Optional[bool] = True
    visible: Optional[bool] = True
    read_only: Optional[bool] = PydanticField(default=False, alias="readOnly")
    colspan: Optional[Union[str, int]] = None  # Grid column width for responsive layout (1-12)
    behavior: Optional[str] = None
    display_format: Optional[str] = PydanticField(None, alias="displayFormat")
    value: Optional[Any] = None
    rich_text: Optional[bool] = PydanticField(default=None, alias="richText")
    dor_bind_ref: Optional[str] = PydanticField(None, alias="dorBindRef")
    data_ref: Optional[str] = PydanticField(None, alias="dataRef")
    checked_value: Optional[Union[str, bool, int, float]] = PydanticField(None, alias="checkedValue")

    @model_validator(mode="before")
    @classmethod
    def validate_field_type(cls, data: Any) -> Any:
        if isinstance(data, dict) and data.get("fieldType") == "panel":
            raise ValueError('fieldType cannot be "panel"')
        return data

    def apply_mappings(self, mappings: Dict[str, str]) -> "CoreComponentField":
        data = self.model_dump(by_alias=True)
        data[":type"] = mappings.get(self.fieldType)
        return CoreComponentField(**data)


class CoreComponentPanel(CoreComponentBase):
    """Model for Core Component panels"""

    fieldType: Literal["panel"] = "panel"
    items: Optional[List[Union[CoreComponentField, "CoreComponentPanel"]]] = None
    colon_items: Optional[Dict[str, Union[CoreComponentField, "CoreComponentPanel"]]] = PydanticField(
        None, alias=":items"
    )
    colon_items_order: Optional[List[str]] = PydanticField(None, alias=":itemsOrder")
    colspan: Optional[Union[str, int]] = None  # Grid column width for responsive layout (1-12)
    behavior: Optional[str] = None

    def children(self) -> List[Union[CoreComponentField, "CoreComponentPanel"]]:
        if self.items is not None:
            return self.items
        if self.colon_items is None:
            return []
        if self.colon_items_order is None:
            return list(self.colon_items.values())
        return [self.colon_items[item_id] for item_id in self.colon_items_order]

    def apply_mappings(self, mappings: Dict[str, str]) -> "CoreComponentPanel":
        def inner(
            element: Union[CoreComponentField, CoreComponentPanel],
        ) -> Union[CoreComponentField, CoreComponentPanel]:
            match element:
                case CoreComponentField():
                    return element.apply_mappings(mappings)
                case CoreComponentPanel():
                    data = element.model_dump(by_alias=True)
                    data[":type"] = mappings.get(element.fieldType)
                    data["items"] = [inner(child) for child in element.children()]
                    return CoreComponentPanel(**data)
            return element

        return inner(self)


# Required for forward references in type hints
CoreComponentPanel.model_rebuild()


class CoreComponentForm(BaseModel):
    """Model for Core Components Form"""

    fieldType: Literal["form"] = "form"
    title: Optional[str] = None
    lang: Optional[str] = None
    properties: Optional[Any] = None
    metadata: Optional[Any] = None
    items: Optional[List[Union[CoreComponentField, CoreComponentPanel]]] = None
    colon_items: Optional[Dict[str, Union[CoreComponentField, CoreComponentPanel]]] = PydanticField(
        None, alias=":items"
    )
    colon_items_order: Optional[List[str]] = PydanticField(None, alias=":itemsOrder")
    colon_type: Optional[str] = PydanticField(None, alias=":type")

    def children(self) -> List[Union[CoreComponentField, CoreComponentPanel]]:
        if self.items is not None:
            return self.items
        if self.colon_items is None:
            return []
        if self.colon_items_order is None:
            return list(self.colon_items.values())
        return [self.colon_items[item_id] for item_id in self.colon_items_order]

    def apply_mappings(self, mappings: Dict[str, str]) -> "CoreComponentForm":
        def inner(
            element: Union[CoreComponentField, CoreComponentPanel, CoreComponentForm],
        ) -> Union[CoreComponentField, CoreComponentPanel, CoreComponentForm]:
            match element:
                case CoreComponentField():
                    return element.apply_mappings(mappings)
                case CoreComponentPanel():
                    return element.apply_mappings(mappings)
                case CoreComponentForm():
                    data = element.model_dump(by_alias=True)
                    data[":type"] = mappings.get(element.fieldType)
                    data["items"] = [inner(child) for child in element.children()]
                    return CoreComponentForm(**data)
            return element

        return inner(self)


class ModelJsonForm(BaseForm):
    """Implementation for Core Components form type"""

    def __init__(self, form_dict: dict):
        self._form: Optional[CoreComponentForm] = None
        super().__init__(form_dict)

    def _parse(self, component: Union[CoreComponentForm, CoreComponentPanel, CoreComponentField]):
        match component.fieldType:
            case "panel":
                assert isinstance(component, CoreComponentPanel)
                panel = Panel(
                    id=component.id,
                    name=component.name,
                    fieldType=component.fieldType,
                    label=component.label_str(),
                    items=[],
                    _raw=component.model_dump(by_alias=True),
                    _raw_source="crispr",
                )
                self._fields.append(panel)
                for item in component.children():
                    item_repr = self._parse(item)
                    panel.items.append(item_repr)
                self._panels.append(panel)
                return panel
            case "form":
                assert isinstance(component, CoreComponentForm)
                for item in component.children():
                    _ = self._parse(item)
            case _:
                assert isinstance(component, CoreComponentField)
                field = Field(
                    id=component.id,
                    name=component.name,
                    fieldType=component.fieldType,
                    label=component.label_str(),
                    _raw=component.model_dump(by_alias=True),
                    enum=component.enum,
                    enumNames=component.enumNames,
                    _raw_source="crispr",
                )
                self._fields.append(field)
                return field

    def _parse_form(self) -> None:
        # Handle the afModelDefinition wrapper if present
        form_dict = self.form_dict.get("afModelDefinition", self.form_dict)

        # Parse the entire form structure into a Pydantic model
        self._form = CoreComponentForm.model_validate(form_dict)
        self._parse(self._form)

    @property
    def model(self) -> CoreComponentForm:
        """Get the parsed form model"""
        if self._form is None:
            raise ValueError("Form has not been parsed yet")
        return self._form

    def flatten(self) -> List[Union[Field, Panel]]:
        return [field for field in self._fields]
