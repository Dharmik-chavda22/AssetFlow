from django.shortcuts import render
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db.models import Q

from .models import *
from .forms import *

# Create your views here.

def department_list(request):
    departments = Department.objects.all()

    return render(
        request,
        "department/list.html",
        {
            "departments": departments
        }
    )

def department_create(request):

    form = DepartmentForm(request.POST or None)

    if form.is_valid():
        form.save()
        messages.success(request, "Department created successfully.")
        return redirect("department_list")

    return render(
        request,
        "department/form.html",
        {
            "form": form,
            "title": "Create Department"
        }
    )

def department_update(request, pk):

    department = get_object_or_404(
        Department,
        pk=pk
    )

    form = DepartmentForm(
        request.POST or None,
        instance=department
    )

    if form.is_valid():
        form.save()
        messages.success(request, "Department updated.")
        return redirect("department_list")

    return render(
        request,
        "department/form.html",
        {
            "form": form,
            "title": "Edit Department"
        }
    )

def department_delete(request, pk):

    department = get_object_or_404(
        Department,
        pk=pk
    )

    if request.method == "POST":
        department.delete()
        messages.success(request, "Department deleted.")
        return redirect("department_list")

    return render(
        request,
        "department/delete.html",
        {
            "department": department
        }
    )

# Category Views

def category_list(request):
    categories = AssetCategory.objects.all()

    return render(
        request,
        "category/list.html",
        {
            "categories": categories
        }
    )

def category_create(request):

    form = AssetCategoryForm(request.POST or None)

    if form.is_valid():
        form.save()
        messages.success(request, "Category created successfully.")
        return redirect("category_list")

    return render(
        request,
        "category/form.html",
        {
            "form": form,
            "title": "Create Category"
        }
    )

def category_update(request, pk):

    category = get_object_or_404(
        AssetCategory,
        pk=pk
    )

    form = AssetCategoryForm(
        request.POST or None,
        instance=category
    )

    if form.is_valid():
        form.save()
        messages.success(request, "Category updated.")
        return redirect("category_list")

    return render(
        request,
        "category/form.html",
        {
            "form": form,
            "title": "Edit Category"
        }
    )

def category_delete(request, pk):

    category = get_object_or_404(
        AssetCategory,
        pk=pk
    )

    if request.method == "POST":
        category.delete()
        messages.success(request, "Category deleted.")
        return redirect("category_list")

    return render(
        request,
        "category/delete.html",
        {
            "category": category
        }
    )


def asset_list(request):

    assets = Asset.objects.all().order_by("-created_at")

    search = request.GET.get("search")

    status = request.GET.get("status")

    category = request.GET.get("category")

    if search:
        assets = assets.filter(
            Q(name__icontains=search) |
            Q(asset_tag__icontains=search)
        )

    if status:
        assets = assets.filter(status=status)

    if category:
        assets = assets.filter(category_id=category)

    return render(
        request,
        "asset/list.html",
        {
            "assets": assets,
            "categories": AssetCategory.objects.all(),
            "statuses": ASSET_STATUS,
        },
    )

def asset_create(request):

    form = AssetForm(request.POST or None)

    if form.is_valid():
        form.save()
        messages.success(request, "Asset created successfully.")
        return redirect("asset_list")

    return render(
        request,
        "asset/form.html",
        {
            "form": form,
            "title": "Create Asset",
        },
    )

def asset_update(request, pk):

    asset = get_object_or_404(
        Asset,
        pk=pk,
    )

    form = AssetForm(
        request.POST or None,
        instance=asset,
    )

    if form.is_valid():
        form.save()
        messages.success(request, "Asset updated.")
        return redirect("asset_list")

    return render(
        request,
        "asset/form.html",
        {
            "form": form,
            "title": "Edit Asset",
        },
    )

def asset_delete(request, pk):

    asset = get_object_or_404(
        Asset,
        pk=pk,
    )

    if request.method == "POST":
        asset.delete()
        messages.success(request, "Asset deleted.")
        return redirect("asset_list")

    return render(
        request,
        "asset/delete.html",
        {
            "asset": asset,
        },
    )

