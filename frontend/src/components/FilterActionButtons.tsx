interface FilterActionButtonsProps {
  onApply?: () => void;
  onExport?: () => void;
}

const FilterActionButtons = ({ onApply, onExport }: FilterActionButtonsProps) => {
  return (
    <div className="flex gap-2">
      <button
        onClick={onApply}
        className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
      >
        Aplicar
      </button>

      <button
        onClick={onExport}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
      >
        Exportar CSV
      </button>
    </div>
  );
};

export default FilterActionButtons;
