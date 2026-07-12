from django.shortcuts import render
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db.models import Q
from django.http import JsonResponse
from django.forms.models import model_to_dict

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

def dashboard(request):
    context = {
        "total_assets": Asset.objects.count(),
        "available_assets": Asset.objects.filter(status="AVAILABLE").count(),
        "allocated_assets": Asset.objects.filter(status="ALLOCATED").count(),
        "maintenance_assets": Asset.objects.filter(status="MAINTENANCE").count(),
        "departments": Department.objects.count(),
        "categories": AssetCategory.objects.count(),
        "employees": EmployeeProfile.objects.count(),

        "recent_assets": Asset.objects.order_by("-created_at")[:5],

        "recent_allocations": Allocation.objects.select_related(
            "asset",
            "employee",
            "employee__user"
        ).order_by("-allocated_on")[:5],
    }

    return render(
        request,
        "dashboard/dashboard.html",
        context
    )

def allocation_list(request):
    allocations = Allocation.objects.select_related(
        "asset",
        "employee",
        "employee__user"
    )

    return render(
        request,
        "allocation/list.html",
        {
            "allocations": allocations
        }
    )

def allocation_create(request):

    form = AllocationForm(request.POST or None)

    if form.is_valid():

        allocation = form.save()

        asset = allocation.asset
        asset.status = "ALLOCATED"
        asset.save()

        messages.success(request, "Asset allocated successfully.")

        return redirect("allocation_list")

    return render(
        request,
        "allocation/form.html",
        {
            "form": form,
            "title": "Allocate Asset"
        }
    )

def allocation_return(request, pk):

    allocation = get_object_or_404(
        Allocation,
        pk=pk
    )

    allocation.returned = True
    allocation.save(update_fields=["returned"])

    asset = allocation.asset
    asset.status = "AVAILABLE"
    asset.save(update_fields=["status"])

    messages.success(request, "Asset returned successfully.")

    return redirect("allocation_list")

def dashboard_api(request):
    return JsonResponse({
        "total_assets": Asset.objects.count(),
        "available_assets": Asset.objects.filter(status="AVAILABLE").count(),
        "allocated_assets": Asset.objects.filter(status="ALLOCATED").count(),
        "maintenance_assets": Asset.objects.filter(status="MAINTENANCE").count(),
        "departments": Department.objects.count(),
        "categories": AssetCategory.objects.count(),
        "employees": EmployeeProfile.objects.count(),
    })

def assets_api(request):

    assets = []

    for asset in Asset.objects.select_related("category", "department"):

        assets.append({
            "id": asset.id,
            "asset_tag": asset.asset_tag,
            "name": asset.name,
            "category": asset.category.name,
            "department": asset.department.name,
            "status": asset.status,
            "condition": asset.condition,
            "location": asset.location,
        })

    return JsonResponse(assets, safe=False)

def departments_api(request):

    data = list(
        Department.objects.values(
            "id",
            "name",
            "code",
            "status"
        )
    )

    return JsonResponse(data, safe=False)

def categories_api(request):

    data = list(
        AssetCategory.objects.values(
            "id",
            "name",
            "description"
        )
    )

    return JsonResponse(data, safe=False)

def allocations_api(request):

    data = []

    allocations = Allocation.objects.select_related(
        "asset",
        "employee",
        "employee__user"
    )

    for allocation in allocations:

        data.append({

            "id": allocation.id,

            "asset": allocation.asset.name,

            "asset_tag": allocation.asset.asset_tag,

            "employee": allocation.employee.user.username,

            "allocated_on": allocation.allocated_on,

            "expected_return": allocation.expected_return,

            "returned": allocation.returned,

        })

    return JsonResponse(data, safe=False)

def employees_api(request):
    data = []

    for emp in EmployeeProfile.objects.select_related("user", "department"):
        data.append({
            "id": emp.id,
            "name": emp.user.get_full_name() or emp.user.username,
            "department": emp.department.name if emp.department else "",
            "role": emp.role,
        })

    return JsonResponse(data, safe=False)