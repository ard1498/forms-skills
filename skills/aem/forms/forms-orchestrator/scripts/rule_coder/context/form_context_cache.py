"""
FormContext caching with automatic invalidation.

This module provides:
1. Caching of FormContext to avoid repeated transformations
2. Automatic invalidation when source files change
3. Manual refresh capability
"""

import json
import os
import hashlib
from typing import Dict, Any, Optional, List
from pathlib import Path
from dataclasses import dataclass, field
import logging

from .form_context import FormContext

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """A cached FormContext with metadata for invalidation."""
    context: FormContext
    form_json_path: str
    form_json_mtime: float
    form_json_hash: str
    custom_functions_path: Optional[str] = None
    custom_functions_mtime: Optional[float] = None
    custom_functions_hash: Optional[str] = None


class FormContextCache:
    """
    Caches FormContext instances with automatic invalidation.

    Usage:
        cache = FormContextCache()

        # Get or create context (auto-caches)
        ctx = cache.get_context("path/to/form.json", "path/to/functions.js")

        # Check if cache is valid
        if cache.is_valid("path/to/form.json"):
            ctx = cache.get_cached("path/to/form.json")

        # Force refresh
        ctx = cache.refresh("path/to/form.json", "path/to/functions.js")

        # Clear all caches
        cache.clear()
    """

    _instance: Optional['FormContextCache'] = None

    def __new__(cls):
        """Singleton pattern - one cache per process."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._cache: Dict[str, CacheEntry] = {}
        return cls._instance

    @staticmethod
    def _get_file_mtime(path: str) -> Optional[float]:
        """Get file modification time."""
        try:
            return os.path.getmtime(path)
        except OSError:
            return None

    @staticmethod
    def _get_file_hash(path: str) -> Optional[str]:
        """Get MD5 hash of file contents."""
        try:
            with open(path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except OSError:
            return None

    def _get_cache_key(self, form_json_path: str) -> str:
        """Generate cache key from form path."""
        return os.path.abspath(form_json_path)

    def is_valid(self, form_json_path: str, custom_functions_path: Optional[str] = None) -> bool:
        """
        Check if cached context is still valid.

        Validates by checking:
        1. Form JSON file modification time and hash
        2. Custom functions file modification time and hash (if provided)

        Args:
            form_json_path: Path to form JSON file.
            custom_functions_path: Optional path to custom functions JS.

        Returns:
            True if cache is valid, False if needs refresh.
        """
        key = self._get_cache_key(form_json_path)

        if key not in self._cache:
            return False

        entry = self._cache[key]

        # Check form JSON
        current_mtime = self._get_file_mtime(form_json_path)
        if current_mtime is None or current_mtime != entry.form_json_mtime:
            # Mtime changed, verify with hash
            current_hash = self._get_file_hash(form_json_path)
            if current_hash != entry.form_json_hash:
                logger.debug(f"Form JSON changed: {form_json_path}")
                return False

        # Check custom functions if path provided
        if custom_functions_path:
            abs_func_path = os.path.abspath(custom_functions_path)

            # If functions path changed
            if entry.custom_functions_path != abs_func_path:
                logger.debug(f"Custom functions path changed")
                return False

            current_mtime = self._get_file_mtime(custom_functions_path)
            if current_mtime is None or current_mtime != entry.custom_functions_mtime:
                current_hash = self._get_file_hash(custom_functions_path)
                if current_hash != entry.custom_functions_hash:
                    logger.debug(f"Custom functions changed: {custom_functions_path}")
                    return False
        elif entry.custom_functions_path is not None:
            # Had functions before, now none provided
            logger.debug("Custom functions removed")
            return False

        return True

    def get_cached(self, form_json_path: str) -> Optional[FormContext]:
        """
        Get cached context without validation.

        Args:
            form_json_path: Path to form JSON file.

        Returns:
            Cached FormContext or None.
        """
        key = self._get_cache_key(form_json_path)
        entry = self._cache.get(key)
        return entry.context if entry else None

    def get_context(
        self,
        form_json_path: str,
        custom_functions_path: Optional[str] = None,
        force_refresh: bool = False
    ) -> FormContext:
        """
        Get FormContext, using cache if valid.

        Args:
            form_json_path: Path to form JSON file.
            custom_functions_path: Optional path to custom functions JS.
            force_refresh: If True, ignore cache and reload.

        Returns:
            FormContext instance.
        """
        if not force_refresh and self.is_valid(form_json_path, custom_functions_path):
            logger.debug(f"Using cached FormContext for: {form_json_path}")
            return self.get_cached(form_json_path)

        return self.refresh(form_json_path, custom_functions_path)

    def refresh(
        self,
        form_json_path: str,
        custom_functions_path: Optional[str] = None
    ) -> FormContext:
        """
        Force refresh the cached context.

        Args:
            form_json_path: Path to form JSON file.
            custom_functions_path: Optional path to custom functions JS.

        Returns:
            Fresh FormContext instance.
        """
        logger.info(f"Loading FormContext: {form_json_path}")

        # Load fresh context
        context = FormContext.load_from_form_file(form_json_path, custom_functions_path)

        # Build cache entry
        key = self._get_cache_key(form_json_path)
        entry = CacheEntry(
            context=context,
            form_json_path=os.path.abspath(form_json_path),
            form_json_mtime=self._get_file_mtime(form_json_path),
            form_json_hash=self._get_file_hash(form_json_path)
        )

        if custom_functions_path:
            entry.custom_functions_path = os.path.abspath(custom_functions_path)
            entry.custom_functions_mtime = self._get_file_mtime(custom_functions_path)
            entry.custom_functions_hash = self._get_file_hash(custom_functions_path)

        self._cache[key] = entry
        logger.debug(f"Cached FormContext for: {form_json_path}")

        return context

    def invalidate(self, form_json_path: str) -> bool:
        """
        Manually invalidate a cached context.

        Args:
            form_json_path: Path to form JSON file.

        Returns:
            True if entry was removed, False if not found.
        """
        key = self._get_cache_key(form_json_path)
        if key in self._cache:
            del self._cache[key]
            logger.debug(f"Invalidated cache for: {form_json_path}")
            return True
        return False

    def clear(self):
        """Clear all cached contexts."""
        self._cache.clear()
        logger.debug("Cleared all FormContext caches")

    def list_cached(self) -> List[str]:
        """List all cached form paths."""
        return list(self._cache.keys())

    def get_cache_info(self, form_json_path: str) -> Optional[Dict[str, Any]]:
        """
        Get cache metadata for debugging.

        Args:
            form_json_path: Path to form JSON file.

        Returns:
            Dict with cache info or None.
        """
        key = self._get_cache_key(form_json_path)
        entry = self._cache.get(key)

        if not entry:
            return None

        return {
            "form_json_path": entry.form_json_path,
            "form_json_mtime": entry.form_json_mtime,
            "custom_functions_path": entry.custom_functions_path,
            "custom_functions_mtime": entry.custom_functions_mtime,
            "is_valid": self.is_valid(form_json_path, entry.custom_functions_path),
            "components_count": len(entry.context.list_all_components()),
            "functions_count": len(entry.context.functions)
        }

    def export_for_cli(self, form_json_path: str) -> Optional[Dict[str, Any]]:
        """
        Export cached context data for use by Node.js CLI tools.

        Returns the treeJson and functions in a format that can be
        passed to CLI tools via --context flag or stdin.

        Args:
            form_json_path: Path to form JSON file.

        Returns:
            Dict with treeJson and functions, or None if not cached.
        """
        key = self._get_cache_key(form_json_path)
        entry = self._cache.get(key)

        if not entry:
            return None

        return entry.context.to_dict()


# Convenience function for getting the singleton
def get_cache() -> FormContextCache:
    """Get the FormContextCache singleton."""
    return FormContextCache()
