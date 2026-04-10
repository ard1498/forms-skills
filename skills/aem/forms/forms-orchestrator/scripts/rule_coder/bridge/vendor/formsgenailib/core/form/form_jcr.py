import json
import os
from functools import cached_property
from typing import Annotated, Any, Dict, List, Literal, Optional, Tuple, Union

from pydantic import BaseModel, BeforeValidator, ConfigDict
from pydantic import Field as PydanticField

from .base import BaseForm, Field, Panel
from .form_crispr import CoreComponentField, CoreComponentForm, CoreComponentPanel


def convert_colspan_to_str(v: Any) -> Optional[str]:
    """Convert integer colspan values to string representation."""
    if v is None:
        return None
    if isinstance(v, int) and 1 <= v <= 12:
        return str(v)
    return v


class ResponsiveDefault(BaseModel):
    """Model for cq:responsive default structure.

    This represents the default responsive behavior for Core Components forms.
    Contains width and offset values for responsive grid layout.
    """

    jcr_primary_type: str = PydanticField("nt:unstructured", alias="jcr:primaryType")
    width: Optional[str] = None  # Grid column width (1-12)
    offset: Optional[str] = "0"  # Grid column offset
    behavior: Optional[str] = None
    model_config = ConfigDict(populate_by_name=True)


class CqResponsive(BaseModel):
    """Model for cq:responsive structure.

    This represents the complete responsive configuration for Core Components forms.
    Contains the default responsive behavior and any responsive breakpoints.
    """

    jcr_primary_type: str = PydanticField("nt:unstructured", alias="jcr:primaryType")
    default: Optional[ResponsiveDefault] = None  # Default responsive behavior

    model_config = ConfigDict(populate_by_name=True)


class JcrBaseNode(BaseModel):
    """Base model for all JCR nodes"""

    jcr_primary_type: str = PydanticField("nt:unstructured", alias="jcr:primaryType")
    sling_resource_type: Optional[str] = PydanticField(None, alias="sling:resourceType")

    name: Optional[str] = None
    fieldType: str
    jcr_title: Optional[str] = PydanticField(None, alias="jcr:title")
    read_only: Optional[bool] = PydanticField(default=False, alias="readOnly")
    enabled: Optional[bool] = PydanticField(default=True)
    visible: Optional[bool] = PydanticField(default=True)
    # Direct colspan for EDS forms
    colspan: Optional[
        Annotated[
            Literal["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
            BeforeValidator(convert_colspan_to_str),
        ]
    ] = None
    behavior: Optional[str] = None
    # cq:responsive structure for Core Components forms
    cq_responsive: Optional[CqResponsive] = PydanticField(None, alias="cq:responsive")
    fd_rules: Optional[Dict[str, Any]] = PydanticField(None, alias="fd:rules")
    fd_events: Optional[Dict[str, Any]] = PydanticField(None, alias="fd:events")

    # Derived Properties
    path: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)
    fd_viewType: Optional[str] = PydanticField(None, alias="fd:viewType")
    xmp_CreatorTool: Optional[str] = PydanticField(None, alias="xmp:CreatorTool")

    @staticmethod
    def _collect_children(element_dict: dict) -> List[Tuple[str, dict]]:
        children = []
        for key, value in element_dict.items():
            if isinstance(value, dict) and "fieldType" in value:
                children.append((key, value))
        return children


class JcrField(JcrBaseNode):
    """Pydantic model for JCR field representation"""

    placeholder: Optional[str] = None
    default: Optional[Union[str, bool, int, float]] = None
    description: Optional[str] = None
    mandatory_message: Optional[str] = PydanticField(None, alias="mandatoryMessage")
    tooltip: Optional[str] = PydanticField(None, alias="tooltip")
    enum: Optional[List[str]] = None
    enumNames: Optional[List[str]] = None
    value: Optional[Any] = None
    type: Optional[
        Literal[
            "boolean",
            "boolean[]",
            "file",
            "file[]",
            "number",
            "number[]",
            "object",
            "object[]",
            "string",
            "string[]",
            "integer",
            "integer[]",
        ]
    ] = None
    required: Optional[bool] = None
    orientation: Optional[str] = None  # For radio/checkbox groups
    text_is_rich: Optional[Union[bool, List[bool]]] = PydanticField(
        default=None, alias="textIsRich"
    )
    buttonType: Optional[Literal["button", "submit", "reset"]] = None  # For buttons
    dor_bind_ref: Optional[str] = PydanticField(None, alias="dorBindRef")
    data_ref: Optional[str] = PydanticField(None, alias="dataRef")
    checked_value: Optional[Union[str, bool, int, float]] = PydanticField(
        None, alias="checkedValue"
    )

    @staticmethod
    def from_repr(repr: Field) -> "JcrField":
        assert repr._raw_source == "jcr", (
            "JcrField can only be created from a JCR representation"
        )
        return JcrField(
            **repr._raw,
            path=repr.path,
        )

    @staticmethod
    def from_crispr(
        crispr_field: "CoreComponentField", target_format: Literal["eds", "cc"] = "eds"
    ) -> "JcrField":
        """Convert a Core Component field to JCR field.

        Args:
            crispr_field: The Core Component field to convert
            target_format: Target format - "eds" for Experience Data Services forms
                          (direct colspan) or "cc" for Core Components forms (cq:responsive)

        Returns:
            JcrField: The converted JCR field with appropriate responsive layout structure
        """
        if target_format == "eds" and crispr_field.colspan is not None:
            # EDS forms: Use direct colspan attribute for responsive layout
            colspan = crispr_field.colspan
            cq_responsive = None
        else:
            # Core Components forms: Use cq:responsive structure for responsive layout
            colspan = None
            # Only create cq:responsive if colspan is present
            if crispr_field.colspan is not None:
                cq_responsive = CqResponsive(
                    jcr_primary_type="nt:unstructured",
                    default=ResponsiveDefault(
                        jcr_primary_type="nt:unstructured",
                        width=crispr_field.colspan,
                        offset="0",
                        behavior=crispr_field.behavior,
                    ),
                )
            else:
                cq_responsive = None

        if crispr_field.fieldType == "checkbox" and crispr_field.checked_value is None:
            crispr_field.checked_value = True

        return JcrField(
            name=crispr_field.name,
            fieldType=crispr_field.fieldType,
            jcr_title=crispr_field.label_str(),
            type=crispr_field.type,
            value=crispr_field.value,
            required=crispr_field.required,
            description=crispr_field.description,
            mandatory_message=crispr_field.mandatory_message,
            tooltip=crispr_field.tooltip,
            default=crispr_field.default,
            enum=crispr_field.enum,
            enumNames=crispr_field.enumNames,
            sling_resource_type=crispr_field.colon_type,
            dor_bind_ref=crispr_field.dor_bind_ref,
            data_ref=crispr_field.data_ref,
            placeholder=crispr_field.placeholder,
            enabled=crispr_field.enabled,
            visible=crispr_field.visible,
            read_only=crispr_field.read_only,
            text_is_rich=crispr_field.rich_text,
            colspan=colspan,
            cq_responsive=cq_responsive,
            fd_rules=crispr_field.rules,
            fd_events=crispr_field.events,
            checked_value=crispr_field.checked_value,
            xmp_CreatorTool="FORMS EXPERIENCE BUILDER SERVICE",
        )

    @staticmethod
    def from_infinity(element_dict: dict, path: str = "") -> "JcrField":
        field_kwargs: Dict[str, Any] = {
            "name": element_dict.get("name"),
            "fieldType": element_dict.get("fieldType"),
            "jcr_title": element_dict.get("jcr:title"),
            "path": path,
            "sling_resource_type": element_dict.get("sling:resourceType"),
        }
        optional_keys = (
            "enum",
            "enumNames",
            "placeholder",
            "default",
            "description",
            "required",
            "tooltip",
            "type",
            "textIsRich",
            "value",
            "buttonType",
            "dorExclusion",
            "fd:rules",
            "fd:events",
        )
        field_kwargs.update(
            {k: v for k, v in element_dict.items() if k in optional_keys}
        )
        return JcrField(**field_kwargs)


class JcrPanel(JcrBaseNode):
    """Pydantic model for JCR panel representation"""

    fieldType: str = "panel"
    items: Dict[str, Union["JcrPanel", JcrField]] = PydanticField(
        default_factory=dict,
        exclude=True,  # Exclude from serialization
    )

    model_config = ConfigDict(
        extra="allow",  # Allow extra fields for dynamic items
        populate_by_name=True,
    )

    def _get_unique_name(self, name: str) -> str:
        """Get a unique name for the item"""
        if name in self.items:
            return f"{name}_{len(self.items)}"
        return name

    def model_dump(self, **kwargs):
        # Get the base dictionary without items
        data = super().model_dump(**kwargs)
        # Add items directly to the parent dictionary
        data.update({k: v.model_dump(**kwargs) for k, v in self.items.items()})
        return data

    @staticmethod
    def from_repr(repr: Panel) -> "JcrPanel":
        assert repr._raw_source == "jcr", (
            "JcrPanel can only be created from a JCR representation"
        )
        return JcrPanel(
            **repr._raw,
            path=repr.path,
        )

    @staticmethod
    def from_crispr(
        crispr_panel: "CoreComponentPanel", target_format: Literal["eds", "cc"] = "eds"
    ) -> "JcrPanel":
        """Convert a Core Component panel to JCR panel.

        Args:
            crispr_panel: The Core Component panel to convert
            target_format: Target format - "eds" for Experience Data Services forms
                          (direct colspan) or "cc" for Core Components forms (cq:responsive)

        Returns:
            JcrPanel: The converted JCR panel with appropriate responsive layout structure
        """

        if target_format == "eds" and crispr_panel.colspan is not None:
            # EDS forms: Use direct colspan attribute for responsive layout
            colspan = crispr_panel.colspan
            cq_responsive = None
        else:
            # Core Components forms: Use cq:responsive structure for responsive layout
            colspan = None
            # Only create cq:responsive if colspan is present
            if crispr_panel.colspan is not None:
                cq_responsive = CqResponsive(
                    jcr_primary_type="nt:unstructured",
                    default=ResponsiveDefault(
                        jcr_primary_type="nt:unstructured",
                        width=crispr_panel.colspan,
                        offset="0",
                        behavior=crispr_panel.behavior,
                    ),
                )
            else:
                cq_responsive = None

        panel = JcrPanel(
            name=crispr_panel.name,
            fieldType="panel",
            sling_resource_type=crispr_panel.colon_type,
            jcr_title=crispr_panel.label_str(),
            colspan=colspan,
            cq_responsive=cq_responsive,
            items={},
            xmp_CreatorTool="FORMS EXPERIENCE BUILDER SERVICE",
        )

        # Convert child items
        for item in crispr_panel.items:
            if isinstance(item, CoreComponentPanel):
                panel.items[panel._get_unique_name(item.name)] = JcrPanel.from_crispr(
                    item, target_format
                )
            else:
                panel.items[panel._get_unique_name(item.name)] = JcrField.from_crispr(
                    item, target_format
                )

        return panel

    @staticmethod
    def from_infinity(element_dict: dict, path: str = "") -> "JcrPanel":
        panel = JcrPanel(
            name=element_dict.get("name"),
            fieldType="panel",
            jcr_title=element_dict.get("jcr:title"),
            sling_resource_type=element_dict.get("sling:resourceType"),
            path=path,
            items={},
        )
        children = JcrPanel._collect_children(element_dict)
        for name, child in children:
            if child["fieldType"] == "panel":
                parsed_child = JcrPanel.from_infinity(child, path + f"/{name}")
            else:
                parsed_child = JcrField.from_infinity(child, path + f"/{name}")
            panel.items[name] = parsed_child
        return panel


class JcrForm(JcrBaseNode):
    """Pydantic model for JCR form representation"""

    fieldType: str = "form"
    fd_version: str = PydanticField("2.1", alias="fd:version")
    title: Optional[str] = None
    themeRef: Optional[str] = None
    thankYouOption: Optional[str] = None
    items: Dict[str, Union[JcrPanel, JcrField]] = PydanticField(
        default_factory=dict,
        exclude=True,  # Exclude from serialization
    )

    model_config = ConfigDict(
        extra="allow",  # Allow extra fields for dynamic items
        populate_by_name=True,
    )

    def _get_unique_name(self, name: str) -> str:
        """Get a unique name for the item"""
        if name in self.items:
            return f"{name}_{len(self.items)}"
        return name

    def model_dump(self, **kwargs):
        # Get the base dictionary without items
        data = super().model_dump(**kwargs)
        # Add items directly to the parent dictionary
        data.update({k: v.model_dump(**kwargs) for k, v in self.items.items()})
        return data

    @classmethod
    def from_crispr(
        cls,
        crispr_form: "CoreComponentForm",
        target_format: Literal["eds", "cc"] = "eds",
    ) -> "JcrForm":
        """Convert a Core Component form to JCR form.

        Args:
            crispr_form: The Core Component form to convert
            target_format: Target format - "eds" for Experience Data Services forms
                          (direct colspan) or "cc" for Core Components forms (cq:responsive)

        Returns:
            JcrForm: The converted JCR form with appropriate responsive layout structure
        """
        items = {}
        form = JcrForm(
            fieldType="form",
            sling_resource_type=crispr_form.colon_type,
            jcr_title=crispr_form.title,
            items=items,
            xmp_CreatorTool="FORMS EXPERIENCE BUILDER SERVICE",
        )
        # Convert all child elements (panels and fields) with the specified target format
        for item in crispr_form.children():
            if isinstance(item, CoreComponentPanel):
                form.items[form._get_unique_name(item.name)] = JcrPanel.from_crispr(
                    item, target_format
                )
            else:
                form.items[form._get_unique_name(item.name)] = JcrField.from_crispr(
                    item, target_format
                )
        return form

    @staticmethod
    def _split_path(path: str) -> List[str]:
        """Normalize and split a JCR element path into segments."""
        if not path:
            return []
        if path == "/":
            return []
        return [seg for seg in path.strip("/").split("/") if seg]

    def _get_container_by_path(self, path: str) -> Union["JcrForm", JcrPanel, None]:
        """Return the container (form or panel) at a given path.
        If the path points to a field (leaf), this returns None."""
        path_segments = JcrForm._split_path(path)
        if not path_segments:
            return self
        current: Union[JcrForm, JcrPanel, JcrField] = self
        for node_name in path_segments:
            if not isinstance(current, (JcrForm, JcrPanel)):
                return None
            child = current.items.get(node_name)
            if child is None:
                return None
            current = child
        return current if isinstance(current, (JcrForm, JcrPanel)) else None

    def _get_parent_and_child_key(
        self, path: str
    ) -> Tuple[Union["JcrForm", JcrPanel, None], Optional[str]]:
        """Return the parent container and the final key (segment) for a path."""
        path_segments = JcrForm._split_path(path)
        if not path_segments:
            return None, None
        parent_path_segments = path_segments[:-1]
        child_key = path_segments[-1]
        parent_path = (
            "/" + "/".join(parent_path_segments) if parent_path_segments else "/"
        )
        parent = self._get_container_by_path(parent_path)
        return parent, child_key

    def _get_node_by_path(self, path: str) -> Optional[Union[JcrPanel, JcrField]]:
        """Return the node (panel or field) at a given path."""
        parent, key = self._get_parent_and_child_key(path)
        if parent is None or key is None:
            return None
        return parent.items.get(key)

    def _recalculate_paths_for_subtree(
        self, node: Union[JcrPanel, JcrField], base_path: str
    ) -> None:
        """Recalculate the `path` for a node and its subtree given a new base path."""
        node.path = base_path
        if isinstance(node, JcrPanel):
            for child_key, child in node.items.items():
                child_path = (
                    f"{base_path}/{child_key}" if base_path else f"/{child_key}"
                )
                self._recalculate_paths_for_subtree(child, child_path)

    def _insert_into_items_before(
        self,
        items: Dict[str, Union[JcrPanel, JcrField]],
        key: str,
        value: Union[JcrPanel, JcrField],
        before_key: Optional[str],
    ) -> Dict[str, Union[JcrPanel, JcrField]]:
        """Return a new dict inserting key/value before before_key (if provided)."""
        if before_key is None or before_key not in items:
            # Append semantics
            new_items = dict(items)
            new_items[key] = value
            return new_items
        new_items: Dict[str, Union[JcrPanel, JcrField]] = {}
        inserted = False
        for k, v in items.items():
            if k == before_key and not inserted:
                new_items[key] = value
                inserted = True
            new_items[k] = v
        if not inserted:
            new_items[key] = value
        return new_items

    def _alias_to_field_name(self, model: BaseModel, prop: str) -> Optional[str]:
        """Map an alias like 'jcr:title' to the model field name like 'jcr_title'."""
        # Get the model class
        model_class = type(model)
        if prop in model_class.model_fields:
            return prop
        # Then try alias lookup
        for fname, f in model_class.model_fields.items():
            if getattr(f, "alias", None) == prop:
                return fname
        return None

    def add(self, element: Union[JcrPanel, JcrField]) -> str:
        """Add a `JcrPanel` or `JcrField` at the form root.

        Args:
            element: The element to add.
            key: Optional key (dict key / path segment). If not provided, a key is derived
                 from `element.name` or `element.fieldType` and made unique.

        Returns:
            The key under which the element was added (path segment).
        """
        base_name = element.name

        new_base_path = f"/{base_name}"
        self._recalculate_paths_for_subtree(element, new_base_path)
        self.items[base_name] = element
        return base_name

    def remove(self, path: str) -> bool:
        """Remove an element (panel or field) by its path.

        Returns True if removed, False if not found.
        """
        parent, element_key = self._get_parent_and_child_key(path)
        if parent is None or element_key is None:
            return False
        if element_key not in parent.items:
            return False
        parent.items.pop(element_key, None)
        return True

    def update(self, path: str, prop: str, value: Any) -> bool:
        """Update a property of a `JcrField` or `JcrPanel` at `path`.

        Supports both field names (e.g. 'jcr_title') and aliases (e.g. 'jcr:title').
        """
        node = self._get_node_by_path(path)
        if node is None:
            return False
        field_name = self._alias_to_field_name(node, prop) or prop
        try:
            setattr(node, field_name, value)
            return True
        except Exception:
            # As a fallback, stash into model_extra for unknown props if allowed
            try:
                if hasattr(node, "model_extra") and isinstance(node.model_extra, dict):
                    node.model_extra[prop] = value
                    return True
            except Exception:
                pass
        return False

    def move(
        self,
        element_path: str,
        destination_path: str,
        before_path: Optional[str] = None,
    ) -> bool:
        """Move an element to a new container with optional ordering.

        Args:
            element_path: Full path of the element to move (e.g., '/panel1/field1').
            destination_path: Path to destination container (form '/' or a panel path).
            before_path: Optional full path of sibling before which to insert.
        """
        src_parent, src_key = self._get_parent_and_child_key(element_path)
        if src_parent is None or src_key is None or src_key not in src_parent.items:
            return False
        node = src_parent.items.pop(src_key)

        dest_container = self._get_container_by_path(destination_path)
        if dest_container is None:
            src_parent.items[src_key] = node
            return False

        desired_key = src_key
        if desired_key in dest_container.items:
            # Discuss if the Name is already present then path will change for subsequent operations
            desired_key = dest_container._get_unique_name(desired_key)

        before_key: Optional[str] = None
        if before_path:
            b_parent, b_key = self._get_parent_and_child_key(before_path)
            if b_parent is dest_container and b_key in dest_container.items:
                before_key = b_key

        # Insert in the desired order
        dest_container.items = self._insert_into_items_before(
            dest_container.items, desired_key, node, before_key
        )

        # Recalculate paths for moved subtree based on new location
        base_path = (
            "" if destination_path in ("", "/") else destination_path.rstrip("/")
        ) + f"/{desired_key}"
        self._recalculate_paths_for_subtree(node, base_path)

        return True

    @staticmethod
    def from_infinity(
        element_dict: dict, path: str = ""
    ) -> Union["JcrForm", JcrPanel, JcrField]:
        """Parse a raw JCR dict into JcrForm/JcrPanel/JcrField tree.

        This mirrors the structure of the input JSON and populates the `items` maps.
        """
        field_type = element_dict["fieldType"]
        match field_type:
            case "form":
                form = JcrForm(
                    fieldType="form",
                    jcr_title=element_dict.get("jcr:title"),
                    title=element_dict.get("title"),
                    themeRef=element_dict.get("themeRef"),
                    thankYouOption=element_dict.get("thankYouOption"),
                    fd_version=element_dict.get("fd:version", "2.1"),
                    sling_resource_type=element_dict.get("sling:resourceType"),
                    path=path,
                    items={},
                    xmp_CreatorTool=element_dict.get("xmp:CreatorTool"),
                )
                children = JcrForm._collect_children(element_dict)
                for name, child in children:
                    if child["fieldType"] == "panel":
                        parsed_child = JcrPanel.from_infinity(child, path + f"/{name}")
                    else:
                        parsed_child = JcrField.from_infinity(child, path + f"/{name}")
                    form.items[name] = parsed_child
                return form
            case "panel":
                return JcrPanel.from_infinity(element_dict, path)
            case _:
                return JcrField.from_infinity(element_dict, path)


class InfinityJsonForm(BaseForm):
    """Implementation for Infinity JSON form type"""

    def _collect_children(self, element_dict: dict) -> List[Tuple[str, dict]]:
        children = []
        for key, value in element_dict.items():
            if isinstance(value, dict):
                if "fieldType" in value:
                    children.append((key, value))
        return children

    def _parse(self, element_dict: dict, path="", symbolicName=""):
        field_type = element_dict["fieldType"]
        match field_type:
            case "form":
                children = self._collect_children(element_dict)
                for name, child in children:
                    self._parse(child, path + f"/{name}", "$form")
            case "panel":
                name = element_dict.get("name")
                symbolicName = f"{symbolicName}.{name}"
                panel = Panel(
                    id=path.split("/")[-1] if path else name,
                    name=name,
                    fieldType=element_dict["fieldType"],
                    label=element_dict.get("jcr:title"),
                    items=[],
                    _raw=element_dict,
                    path=path,
                    symbolicName=symbolicName,
                    _raw_source="jcr",
                )
                self._fields.append(panel)
                children = self._collect_children(element_dict)
                children = [
                    self._parse(child, path + f"/{name}", symbolicName)
                    for (name, child) in children
                ]
                panel.items = children
                self._panels.append(panel)
                return panel
            case _:
                name = element_dict.get("name")
                symbolicName = f"{symbolicName}.{name}"
                field = Field(
                    id=path.split("/")[-1] if path else name,
                    name=name,
                    fieldType=element_dict["fieldType"],
                    label=element_dict.get("jcr:title"),
                    _raw=element_dict,
                    path=path,
                    symbolicName=symbolicName,
                    _raw_source="jcr",
                )
                if "enum" in element_dict:
                    field.enum = element_dict["enum"]
                if "enumNames" in element_dict:
                    field.enumNames = element_dict["enumNames"]
                self._fields.append(field)
                return field

    def _parse_form(self) -> None:
        self._parse(self.form_dict)

    def flatten(self) -> List[Union[Field, Panel]]:
        return [field for field in self._fields]

    def _extract_from_raw(
        self, ref: str, element: Union[Field, Panel]
    ) -> Optional[str]:
        """Extract value from field or panel's raw dictionary using dot notation.

        Args:
            ref: Reference path using dot notation (e.g. "properties.f.validationStatus")
            element: Field or Panel object to extract from

        Returns:
            Extracted value or None if not found

        Example:
            >>> field = Field(...)  # Field with properties.fd:rules.validationStatus = "valid"
            >>> _extract_from_raw("properties.fd:rules.validationStatus", field)
            'valid'
        """
        if not ref or not element or not hasattr(element, "_raw"):
            return None

        parts = ref.split(".")
        current = element._raw

        try:
            for part in parts:
                if not isinstance(current, dict):
                    return None
                current = current.get(part)
                if current is None:
                    return None
            return current
        except (KeyError, TypeError, AttributeError):
            return None

    def filter(self, allowlist: List[str]) -> List[dict]:
        """Filter fields and return only specified properties.

        Args:
            allowlist: List of property names to include

        Returns:
            List of dictionaries containing only the specified properties
        """
        result = []
        for field in self._fields:
            item_dict = {}
            for item in allowlist:
                if hasattr(field, item):
                    value = getattr(field, item)
                    if value is not None:
                        item_dict[item] = value
                else:
                    value = self._extract_from_raw(item, field)
                    if value is not None:
                        item_dict[item] = value
            if item_dict:  # Only append if we found any matching properties
                result.append(item_dict)
        return result

    def rules(self) -> List[dict]:
        fields = self._fields
        result = []
        for field in fields:
            raw_dict = field._raw
            fd_rules_dict = raw_dict.get("fd:rules", {})
            for name, rules in fd_rules_dict.items():
                if "fd:" not in name:
                    continue
                if not isinstance(rules, list):
                    rules = [rules]
                for rule in rules:
                    result.append(
                        {
                            "path": field.path,
                            "type": name,
                            "rule": rule,
                            "name": field.name,
                        }
                    )
        return result

    def to_tree(self) -> dict:
        """Transform the form into a tree structure with elementPath and children.

        Returns:
            dict: A tree structure where each node has elementPath and children properties.
            Example:
            {
                "elementPath": "/",
                "children": {
                    "panel1": {
                        "elementPath": "/panel1",
                        "name": "panel1",
                        "children": {
                            "field1": {
                                "elementPath": "/panel1/field1",
                                "name": "field1"
                            }
                        }
                    }
                }
            }
        """

        def _build_tree(element: Union[Field, Panel], path: str = "") -> dict:
            result = {"elementPath": path, "label": element.label}

            if isinstance(element, Panel):
                result["children"] = {}
                for child in element.items:
                    result["children"][child.id] = _build_tree(child, child.path)

            return result

        # Start with root form
        root = {"elementPath": "", "name": "form", "children": {}}

        # Process all panels first
        for panel in self._panels:
            if not panel.path:  # Skip if no path
                continue
            root["children"][panel.id] = _build_tree(panel, panel.path)

        # Process fields that are direct children of the form (not in panels)
        for field in self._fields:
            if not field.path or isinstance(
                field, Panel
            ):  # Skip panels and fields without path
                continue
            # Only process fields that are direct children (path has one segment)
            path_parts = field.path.strip("/").split("/")
            if len(path_parts) == 1:
                root["children"][field.id] = {
                    "elementPath": field.path,
                    "label": field.label,
                }

        return root

    @cached_property
    def _field_names(self) -> set[str]:
        """Cached set of all field names for O(1) lookup.

        Returns:
            set[str]: Set of all non-empty field names in the form
        """
        return {field.name for field in self._fields if field.name}

    @cached_property
    def _field_paths(self) -> set[str]:
        """Cached set of all field paths for O(1) lookup.

        Returns:
            set[str]: Set of all non-empty field paths in the form
        """
        return {field.path for field in self._fields if field.path}

    def field_exists_by_name(self, name: str) -> bool:
        """Check if a field with the given name exists in the form.

        Time Complexity: O(1) - Uses cached set lookup
        Memory: O(n) - Cached set of field names

        Args:
            name: The name of the field to search for

        Returns:
            bool: True if a field with the given name exists, False otherwise
        """
        if not name:
            return False
        return name in self._field_names

    def field_exists_by_path(self, path: str) -> bool:
        """Check if a field at the given path exists in the form.

        Time Complexity: O(1) - Uses cached set lookup
        Memory: O(n) - Cached set of field paths

        Args:
            path: The path of the field to search for (e.g., "/panel1/field1")

        Returns:
            bool: True if a field at the given path exists, False otherwise
        """
        if not path:
            return False
        return path in self._field_paths


def get_allowed_properties(
    field_type: str,
    filter_properties: List[str],
    form_type: Literal["eds", "cc"] = "eds",
) -> List[str]:
    """Get allowed properties for a field type based on form type.

    Args:
        field_type: The type of the field
        filter_properties: List of properties to filter
        form_type: The type of the form

    Returns:
        List[str]: List of allowed properties
    """
    if form_type == "eds":
        eds_props_path = os.path.join(
            os.path.dirname(__file__), "../../../data/eds_form_props.json"
        )
        with open(eds_props_path, "r", encoding="utf-8") as f:
            eds_props = json.load(f)
        all_properties = (
            eds_props.get("formComponents", {})
            .get(field_type, {})
            .get("properties", {})
            .keys()
        )
        return [prop for prop in filter_properties if prop in all_properties]
    else:
        return filter_properties
