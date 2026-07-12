from django.shortcuts import render
from core.models import Asset, Department, AssetCategory

# Create your views here.

def dashboard(request):
    context = {
        "total_assets": Asset.objects.count(),
        "available_assets": Asset.objects.filter(status="AVAILABLE").count(),
        "allocated_assets": Asset.objects.filter(status="ALLOCATED").count(),
        "maintenance_assets": Asset.objects.filter(status="MAINTENANCE").count(),
        "departments": Department.objects.count(),
        "categories": AssetCategory.objects.count(),
    }

    return render(request, "dashboard/dashboard.html", context)