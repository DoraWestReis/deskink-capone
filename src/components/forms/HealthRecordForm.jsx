import React from 'react';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Pill, Stethoscope } from 'lucide-react';

export default function HealthRecordForm({ record, onChange, disabled }) {
  const handleCheckboxChange = (field, checked) => {
    onChange({ ...record, [field]: checked });
  };

  return (
    <div className="space-y-6">
      {/* Você possui ou já teve: */}
      <div className="p-4 bg-red-50 rounded-xl border border-red-100">
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="w-4 h-4 text-red-600" />
          <h4 className="font-semibold text-sm text-red-900">Você possui ou já teve:</h4>
        </div>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="has_diabetes"
              checked={record?.has_diabetes || false}
              onCheckedChange={(checked) => handleCheckboxChange('has_diabetes', checked)}
              disabled={disabled}
            />
            <Label htmlFor="has_diabetes" className="text-sm text-slate-700 cursor-pointer">
              Diabetes
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="has_hypertension"
              checked={record?.has_hypertension || false}
              onCheckedChange={(checked) => handleCheckboxChange('has_hypertension', checked)}
              disabled={disabled}
            />
            <Label htmlFor="has_hypertension" className="text-sm text-slate-700 cursor-pointer">
              Hipertensão
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="has_keloid_or_hypertrophic_scar"
              checked={record?.has_keloid_or_hypertrophic_scar || false}
              onCheckedChange={(checked) => handleCheckboxChange('has_keloid_or_hypertrophic_scar', checked)}
              disabled={disabled}
            />
            <Label htmlFor="has_keloid_or_hypertrophic_scar" className="text-sm text-slate-700 cursor-pointer">
              Queloide ou cicatriz hipertrófica
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="has_autoimmune_disease"
              checked={record?.has_autoimmune_disease || false}
              onCheckedChange={(checked) => handleCheckboxChange('has_autoimmune_disease', checked)}
              disabled={disabled}
            />
            <Label htmlFor="has_autoimmune_disease" className="text-sm text-slate-700 cursor-pointer">
              Doença autoimune
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="has_anemia"
              checked={record?.has_anemia || false}
              onCheckedChange={(checked) => handleCheckboxChange('has_anemia', checked)}
              disabled={disabled}
            />
            <Label htmlFor="has_anemia" className="text-sm text-slate-700 cursor-pointer">
              Anemia
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="has_fainting_history"
              checked={record?.has_fainting_history || false}
              onCheckedChange={(checked) => handleCheckboxChange('has_fainting_history', checked)}
              disabled={disabled}
            />
            <Label htmlFor="has_fainting_history" className="text-sm text-slate-700 cursor-pointer">
              Histórico de desmaio
            </Label>
          </div>
          <div className="mt-2">
            <Textarea
              value={record?.other_conditions || ''}
              onChange={(e) => onChange({ ...record, other_conditions: e.target.value })}
              placeholder="Outros..."
              disabled={disabled}
              className="bg-white/60 border-red-200 min-h-[60px] text-sm"
            />
          </div>
        </div>
      </div>

      {/* Uso de medicamentos */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <div className="flex items-center gap-2 mb-3">
          <Pill className="w-4 h-4 text-blue-600" />
          <h4 className="font-semibold text-sm text-blue-900">Uso de medicamentos</h4>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-slate-700 mb-2">Remédio de uso contínuo:</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="uses_anticoagulants"
                checked={record?.uses_anticoagulants || false}
                onCheckedChange={(checked) => handleCheckboxChange('uses_anticoagulants', checked)}
                disabled={disabled}
              />
              <Label htmlFor="uses_anticoagulants" className="text-sm text-slate-700 cursor-pointer">
                Anticoagulantes (ex: AAS, Marevan)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="uses_corticosteroids"
                checked={record?.uses_corticosteroids || false}
                onCheckedChange={(checked) => handleCheckboxChange('uses_corticosteroids', checked)}
                disabled={disabled}
              />
              <Label htmlFor="uses_corticosteroids" className="text-sm text-slate-700 cursor-pointer">
                Corticoide
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="uses_roacutan_isotretinoin"
                checked={record?.uses_roacutan_isotretinoin || false}
                onCheckedChange={(checked) => handleCheckboxChange('uses_roacutan_isotretinoin', checked)}
                disabled={disabled}
              />
              <Label htmlFor="uses_roacutan_isotretinoin" className="text-sm text-slate-700 cursor-pointer">
                Roacutan / Isotretinoína
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="uses_antibiotics"
                checked={record?.uses_antibiotics || false}
                onCheckedChange={(checked) => handleCheckboxChange('uses_antibiotics', checked)}
                disabled={disabled}
              />
              <Label htmlFor="uses_antibiotics" className="text-sm text-slate-700 cursor-pointer">
                Antibióticos
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="uses_antidepressants"
                checked={record?.uses_antidepressants || false}
                onCheckedChange={(checked) => handleCheckboxChange('uses_antidepressants', checked)}
                disabled={disabled}
              />
              <Label htmlFor="uses_antidepressants" className="text-sm text-slate-700 cursor-pointer">
                Antidepressivos
              </Label>
            </div>
          </div>
          <div className="mt-2">
            <Textarea
              value={record?.other_medications || ''}
              onChange={(e) => onChange({ ...record, other_medications: e.target.value })}
              placeholder="Outros medicamentos em uso..."
              disabled={disabled}
              className="bg-white/60 border-blue-200 min-h-[60px] text-sm"
            />
          </div>
        </div>
      </div>

      {/* Alergias */}
      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h4 className="font-semibold text-sm text-amber-900">Alergias</h4>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-slate-700 mb-2">Você possui alergia a:</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="allergies_latex"
                checked={record?.allergies_latex || false}
                onCheckedChange={(checked) => handleCheckboxChange('allergies_latex', checked)}
                disabled={disabled}
              />
              <Label htmlFor="allergies_latex" className="text-sm text-slate-700 cursor-pointer">
                Látex
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="allergies_metals"
                checked={record?.allergies_metals || false}
                onCheckedChange={(checked) => handleCheckboxChange('allergies_metals', checked)}
                disabled={disabled}
              />
              <Label htmlFor="allergies_metals" className="text-sm text-slate-700 cursor-pointer">
                Metais
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="allergies_pigments"
                checked={record?.allergies_pigments || false}
                onCheckedChange={(checked) => handleCheckboxChange('allergies_pigments', checked)}
                disabled={disabled}
              />
              <Label htmlFor="allergies_pigments" className="text-sm text-slate-700 cursor-pointer">
                Pigmentos
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="allergies_anesthetics"
                checked={record?.allergies_anesthetics || false}
                onCheckedChange={(checked) => handleCheckboxChange('allergies_anesthetics', checked)}
                disabled={disabled}
              />
              <Label htmlFor="allergies_anesthetics" className="text-sm text-slate-700 cursor-pointer">
                Anestésicos
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="allergies_medications"
                checked={record?.allergies_medications || false}
                onCheckedChange={(checked) => handleCheckboxChange('allergies_medications', checked)}
                disabled={disabled}
              />
              <Label htmlFor="allergies_medications" className="text-sm text-slate-700 cursor-pointer">
                Medicamentos
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="allergies_none"
                checked={record?.allergies_none || false}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange({
                      ...record,
                      allergies_latex: false,
                      allergies_metals: false,
                      allergies_pigments: false,
                      allergies_anesthetics: false,
                      allergies_medications: false,
                      allergies_none: true,
                      allergies_reaction_details: ''
                    });
                  } else {
                    onChange({ ...record, allergies_none: false });
                  }
                }}
                disabled={disabled}
              />
              <Label htmlFor="allergies_none" className="text-sm text-slate-700 cursor-pointer">
                Nenhuma
              </Label>
            </div>
          </div>
          {(record?.allergies_latex || record?.allergies_metals || record?.allergies_pigments || record?.allergies_anesthetics || record?.allergies_medications) && !record?.allergies_none && (
            <div className="mt-4">
              <Label htmlFor="allergies_reaction_details" className="text-sm text-slate-700 mb-1 block">
                Se sim, qual reação costuma apresentar?
              </Label>
              <Textarea
                id="allergies_reaction_details"
                value={record?.allergies_reaction_details || ''}
                onChange={(e) => onChange({ ...record, allergies_reaction_details: e.target.value })}
                placeholder="Detalhes da reação..."
                disabled={disabled}
                className="bg-white/60 border-amber-200 min-h-[60px] text-sm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}