from django import forms

from .models import Department, AssetCategory, Asset, Allocation


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

class AllocationForm(forms.ModelForm):

    expected_return = forms.DateField(
        widget=forms.DateInput(attrs={"type": "date"})
    )

    class Meta:
        model = Allocation
        fields = [
            "asset",
            "employee",
            "expected_return",
            "remarks",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["asset"].queryset = Asset.objects.filter(
            status="AVAILABLE"
        )

    def clean_asset(self):
        asset = self.cleaned_data["asset"]

        if asset.status != "AVAILABLE":
            raise forms.ValidationError(
                "Only available assets can be allocated."
            )

        return asset