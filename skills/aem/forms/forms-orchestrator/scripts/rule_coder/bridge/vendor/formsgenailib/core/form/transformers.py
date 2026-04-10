from typing import Literal, Union

from .form_crispr import (
    CoreComponentField,
    CoreComponentForm,
    CoreComponentPanel,
    ModelJsonForm,
)
from .form_jcr import InfinityJsonForm, JcrField, JcrForm, JcrPanel


def core_component_to_jcr(
    element: CoreComponentField
    | CoreComponentPanel
    | CoreComponentForm
    | ModelJsonForm,
    target_format: Literal["eds", "cc"] = "eds",
) -> JcrField | JcrPanel | JcrForm:
    """Convert Core Component elements to JCR format.

    This function handles the conversion of Core Component form elements to their JCR
    representation, supporting two different responsive layout formats:
    - EDS (Experience Data Services): Uses direct colspan attributes
    - CC (Core Components): Uses cq:responsive structure

    Args:
        element: CoreComponent element to convert (field, panel, or form)
        target_format: Target JCR format - "eds" for Experience Data Services forms
                      (direct colspan) or "cc" for Core Components forms (cq:responsive)

    Returns:
        JcrField | JcrPanel | JcrForm: The converted JCR element with appropriate
        responsive layout structure

    Raises:
        ValueError: If the element type is not supported for conversion
    """
    match element:
        case CoreComponentField():
            return JcrField.from_crispr(element, target_format)
        case CoreComponentPanel():
            return JcrPanel.from_crispr(element, target_format)
        case CoreComponentForm():
            return JcrForm.from_crispr(element, target_format)
        case ModelJsonForm():
            return JcrForm.from_crispr(element.model, target_format)
        case _:
            raise ValueError(
                f"Cannot convert {element.__class__.__name__} to JCR format"
            )


def jcr_to_core_component(
    element: JcrField | JcrPanel | JcrForm | InfinityJsonForm,
) -> CoreComponentField | CoreComponentPanel | CoreComponentForm:
    """Convert JCR elements to Core Component format.

    This function handles the conversion of JCR form elements to their Core Component
    representation. It extracts colspan from either direct colspan attribute (EDS forms)
    or from cq:responsive structure (CC forms).

    Args:
        element: JCR element to convert (field, panel, or form)

    Returns:
        CoreComponentField | CoreComponentPanel | CoreComponentForm: The converted
        Core Component element

    Raises:
        ValueError: If the element type is not supported for conversion
    """
    match element:
        case JcrField():
            return _jcr_field_to_crispr(element)
        case JcrPanel():
            return _jcr_panel_to_crispr(element)
        case JcrForm():
            return _jcr_form_to_crispr(element)
        case InfinityJsonForm():
            # Parse the form dict into JcrForm and convert
            jcr_form = JcrForm.from_infinity(element.form_dict)
            if isinstance(jcr_form, JcrForm):
                return _jcr_form_to_crispr(jcr_form)
            raise ValueError("Expected JcrForm from InfinityJsonForm")
        case _:
            raise ValueError(
                f"Cannot convert {element.__class__.__name__} to Core Component format"
            )


def _extract_colspan(element: Union[JcrField, JcrPanel]) -> str | None:
    """Extract colspan from JCR element (either direct or from cq:responsive)."""
    # First check direct colspan (EDS format)
    if element.colspan is not None:
        return element.colspan
    # Then check cq:responsive structure (CC format)
    if element.cq_responsive and element.cq_responsive.default:
        return element.cq_responsive.default.width
    return None


def _extract_behavior(element: Union[JcrField, JcrPanel]) -> str | None:
    """Extract behavior from JCR element (either direct or from cq:responsive)."""
    if element.behavior is not None:
        return element.behavior
    if element.cq_responsive and element.cq_responsive.default:
        return element.cq_responsive.default.behavior
    return None


def _jcr_field_to_crispr(jcr_field: JcrField) -> CoreComponentField:
    """Convert a JCR field to Core Component field."""
    return CoreComponentField(
        name=jcr_field.name or "",
        fieldType=jcr_field.fieldType,
        label=jcr_field.jcr_title,
        description=jcr_field.description,
        colon_type=jcr_field.sling_resource_type,
        type=jcr_field.type,
        default=jcr_field.default,
        required=jcr_field.required,
        enum=jcr_field.enum,
        enumNames=jcr_field.enumNames,
        placeholder=jcr_field.placeholder,
        enabled=jcr_field.enabled,
        visible=jcr_field.visible,
        read_only=jcr_field.read_only,
        colspan=_extract_colspan(jcr_field),
        behavior=_extract_behavior(jcr_field),
        value=jcr_field.value,
        mandatory_message=jcr_field.mandatory_message,
        tooltip=jcr_field.tooltip,
        rules=jcr_field.fd_rules,
        events=jcr_field.fd_events,
        dor_bind_ref=jcr_field.dor_bind_ref,
        data_ref=jcr_field.data_ref,
        checked_value=jcr_field.checked_value,
        rich_text=jcr_field.text_is_rich
        if isinstance(jcr_field.text_is_rich, bool)
        else None,
    )


def _jcr_panel_to_crispr(jcr_panel: JcrPanel) -> CoreComponentPanel:
    """Convert a JCR panel to Core Component panel."""
    items = []
    for item in jcr_panel.items.values():
        if isinstance(item, JcrPanel):
            items.append(_jcr_panel_to_crispr(item))
        else:
            items.append(_jcr_field_to_crispr(item))

    return CoreComponentPanel(
        name=jcr_panel.name or "",
        fieldType="panel",
        label=jcr_panel.jcr_title,
        colon_type=jcr_panel.sling_resource_type,
        items=items,
        colspan=_extract_colspan(jcr_panel),
        behavior=_extract_behavior(jcr_panel),
    )


def _jcr_form_to_crispr(jcr_form: JcrForm) -> CoreComponentForm:
    """Convert a JCR form to Core Component form."""
    items = []
    for item in jcr_form.items.values():
        if isinstance(item, JcrPanel):
            items.append(_jcr_panel_to_crispr(item))
        else:
            items.append(_jcr_field_to_crispr(item))

    # Use model_validate with alias since CoreComponentForm doesn't have populate_by_name=True
    return CoreComponentForm.model_validate(
        {
            "fieldType": "form",
            "title": jcr_form.jcr_title or jcr_form.title,
            ":type": jcr_form.sling_resource_type,
            "items": items,
        }
    )
