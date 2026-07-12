from django import forms

from .models import Department, AssetCategory, Asset


class DepartmentForm(forms.ModelForm):
    class Meta:
        model = Department
        fields = "__all__"


class AssetCategoryForm(forms.ModelForm):
    class Meta:
        model = AssetCategory
        fields = "__all__"


class AssetForm(forms.ModelForm):
    acquisition_date = forms.DateField(
        widget=forms.DateInput(attrs={"type": "date"})
    )

    class Meta:
        model = Asset
        fields = "__all__"