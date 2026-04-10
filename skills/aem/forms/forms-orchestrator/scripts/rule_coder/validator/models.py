"""Pydantic models for rule validation."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class RuleNode(BaseModel):
    """A node in the rule tree."""
    nodeName: str = Field(..., description="Name of the grammar node")
    items: Optional[List[Any]] = Field(default=None, description="Child items (for sequence/array nodes)")
    choice: Optional[Dict[str, Any]] = Field(default=None, description="Choice node (for choice nodes)")
    value: Optional[Any] = Field(default=None, description="Terminal value (for terminal nodes)")
    rule: Optional[str] = Field(default=None, description="Rule string (for some nodes)")
    nested: Optional[bool] = Field(default=None, description="Nested flag (for CONDITION nodes)")
    functionName: Optional[Dict[str, Any]] = Field(default=None, description="Function definition (for FUNCTION_CALL)")
    params: Optional[List[Any]] = Field(default=None, description="Function parameters (for FUNCTION_CALL)")
    parentNodeName: Optional[str] = Field(default=None, description="Parent node name (for FUNCTION_CALL)")

    class Config:
        extra = "allow"  # Allow additional fields like isValid, enabled, eventName, etc.


class ValidationResult(BaseModel):
    """Result of rule validation."""
    valid: bool = Field(..., description="Whether the rule is valid")
    errors: List[str] = Field(default_factory=list, description="List of validation errors")
    warnings: List[str] = Field(default_factory=list, description="List of validation warnings")


class ComponentReference(BaseModel):
    """A component reference in a rule."""
    id: str = Field(..., description="Component ID")
    displayName: Optional[str] = Field(default=None, description="Display name")
    type: Optional[str] = Field(default=None, description="Component type")
    name: Optional[str] = Field(default=None, description="Component name")
    parent: Optional[str] = Field(default=None, description="Parent component ID")
    displayPath: Optional[str] = Field(default=None, description="Display path")
    isDuplicate: Optional[bool] = Field(default=False, description="Whether this is a duplicate")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")

    class Config:
        extra = "allow"


class FunctionReference(BaseModel):
    """A function reference in a rule."""
    id: str = Field(..., description="Function ID")
    displayName: Optional[str] = Field(default=None, description="Display name")
    type: Optional[str] = Field(default=None, description="Return type")
    args: Optional[List[Dict[str, Any]]] = Field(default=None, description="Function arguments")
    impl: Optional[str] = Field(default=None, description="Implementation pattern")
    isDuplicate: Optional[bool] = Field(default=False, description="Whether this is a duplicate")
    displayPath: Optional[str] = Field(default="", description="Display path")

    class Config:
        extra = "allow"
