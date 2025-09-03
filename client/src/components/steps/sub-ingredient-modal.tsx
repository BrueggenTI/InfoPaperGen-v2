import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

// Moved from ingredients-step.tsx
export interface SubIngredient {
  name: string;
  percentage: number;
}

// Moved from ingredients-step.tsx
export interface Ingredient {
  name: string;
  originalName?: string;
  translatedName?: string;
  percentage?: number | null;
  origin?: string;
  isMarkedAsBase: boolean;
  isWholegrain: boolean;
  language: 'original' | 'english';
  subIngredients?: SubIngredient[];
}

interface SubIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient: Ingredient | null;
  onSave: (subIngredients: SubIngredient[]) => void;
}

export const SubIngredientModal: React.FC<SubIngredientModalProps> = ({ isOpen, onClose, ingredient, onSave }) => {
  const [subIngredients, setSubIngredients] = useState<SubIngredient[]>([]);
  const [newName, setNewName] = useState("");
  const [newPercentage, setNewPercentage] = useState("");

  useEffect(() => {
    if (ingredient?.subIngredients) {
      setSubIngredients(ingredient.subIngredients);
    } else {
      setSubIngredients([]);
    }
    // Reset form fields when modal opens for a new ingredient
    setNewName("");
    setNewPercentage("");
  }, [ingredient]);

  if (!ingredient) return null;

  const handleAdd = () => {
    if (newName.trim() && newPercentage) {
      const percentage = parseFloat(newPercentage);
      if (!isNaN(percentage) && percentage > 0) {
        setSubIngredients([...subIngredients, { name: newName.trim(), percentage }]);
        setNewName("");
        setNewPercentage("");
      }
    }
  };

  const handleRemove = (index: number) => {
    setSubIngredients(subIngredients.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(subIngredients);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit sub-ingredients for: {ingredient.name}</DialogTitle>
          <DialogDescription>
            Add or remove sub-ingredients. The percentage should be relative to the main ingredient.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {subIngredients.map((sub, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <span>{sub.name} ({sub.percentage}%)</span>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(index)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-end space-x-2 pt-4 border-t mt-4">
            <div className="flex-grow">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g. Cocoa Butter"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="w-32">
              <label className="text-sm font-medium">Percentage (%)</label>
              <Input
                type="number"
                placeholder="e.g. 70"
                value={newPercentage}
                onChange={(e) => setNewPercentage(e.target.value)}
              />
            </div>
            <Button onClick={handleAdd} type="button">Add</Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
