from django.contrib import admin
from .models import *


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "status")
    search_fields = ("name", "code")


@admin.register(EmployeeProfile)
class EmployeeProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "department", "role")
    search_fields = ("user__username",)


@admin.register(AssetCategory)
class AssetCategoryAdmin(admin.ModelAdmin):
    list_display = ("name",)


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = (
        "asset_tag",
        "name",
        "category",
        "department",
        "status",
    )

    search_fields = (
        "asset_tag",
        "name",
        "serial_number",
    )

    list_filter = (
        "status",
        "category",
        "department",
    )