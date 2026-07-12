from django.urls import path
from . import views

urlpatterns = [
    path("departments/", views.department_list, name="department_list"),

    path("departments/create/", views.department_create, name="department_create"),

    path("departments/<int:pk>/edit/", views.department_update, name="department_update"),

    path("departments/<int:pk>/delete/", views.department_delete, name="department_delete"),

    path(
        "categories/",
        views.category_list,
        name="category_list",
    ),

    path(
        "categories/create/",
        views.category_create,
        name="category_create",
    ),

    path(
        "categories/<int:pk>/edit/",
        views.category_update,
        name="category_update",
    ),

    path(
        "categories/<int:pk>/delete/",
        views.category_delete,
        name="category_delete",
    ),

    path(
        "assets/",
        views.asset_list,
        name="asset_list",
    ),

    path(
        "assets/create/",
        views.asset_create,
        name="asset_create",
    ),

    path(
        "assets/<int:pk>/edit/",
        views.asset_update,
        name="asset_update",
    ),

    path(
        "assets/<int:pk>/delete/",
        views.asset_delete,
        name="asset_delete",
    ),

    path("", views.dashboard, name="dashboard"),

    path(
        "allocations/",
        views.allocation_list,
        name="allocation_list",
    ),

    path(
        "allocations/create/",
        views.allocation_create,
        name="allocation_create",
    ),

    path(
        "allocations/<int:pk>/return/",
        views.allocation_return,
        name="allocation_return",
    ),

    path("api/dashboard/", views.dashboard_api),

    path("api/assets/", views.assets_api),

    path("api/departments/", views.departments_api),

    path("api/categories/", views.categories_api),

    path("api/allocations/", views.allocations_api),

    path("api/employees/", views.employees_api),

]