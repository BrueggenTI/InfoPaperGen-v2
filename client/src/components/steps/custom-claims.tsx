import { useState } from "react";
import { ProductInfo } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Edit, Save, Ban } from "lucide-react";

// Define the type for a single manual claim based on the schema
type ManualClaim = NonNullable<NonNullable<ProductInfo['declarations']>['manualClaims']>[0];

interface CustomClaimsProps {
  // We need the whole declarations object to update it correctly
  declarations: NonNullable<ProductInfo['declarations']>;
  // The onUpdate function expects a partial ProductInfo, so we'll pass { declarations: ... }
  onUpdate: (data: Partial<Pick<ProductInfo, 'declarations'>>) => void;
}

export default function CustomClaims({ declarations, onUpdate }: CustomClaimsProps) {
  const [newClaimText, setNewClaimText] = useState("");
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const manualClaims = declarations.manualClaims || [];

  const handleAddClaim = () => {
    if (newClaimText.trim() === "") return;

    const newClaim: ManualClaim = {
      id: `claim-${Date.now()}-${Math.random()}`, // Simple unique ID for session-only
      text: newClaimText.trim(),
      isActive: true, // New claims are active by default
    };

    const updatedClaims = [...manualClaims, newClaim];
    onUpdate({
      declarations: {
        ...declarations,
        manualClaims: updatedClaims,
      },
    });

    setNewClaimText(""); // Clear input after adding
  };

  const handleUpdateClaim = (id: string, updates: Partial<Omit<ManualClaim, 'id'>>) => {
    const updatedClaims = manualClaims.map((claim) =>
      claim.id === id ? { ...claim, ...updates } : claim
    );
    onUpdate({
      declarations: {
        ...declarations,
        manualClaims: updatedClaims,
      },
    });
  };

  const handleDeleteClaim = (id: string) => {
    const updatedClaims = manualClaims.filter((claim) => claim.id !== id);
    onUpdate({
      declarations: {
        ...declarations,
        manualClaims: updatedClaims,
      },
    });
  };

  const startEditing = (claim: ManualClaim) => {
    setEditingClaimId(claim.id);
    setEditingText(claim.text);
  };

  const cancelEditing = () => {
    setEditingClaimId(null);
    setEditingText("");
  };

  const saveEditing = (id: string) => {
    if (editingText.trim() === "") {
        // If text is empty, just delete the claim
        handleDeleteClaim(id);
    } else {
        handleUpdateClaim(id, { text: editingText.trim() });
    }
    cancelEditing();
  };


  return (
    <div className="space-y-4 pt-4 mt-4 border-t">
      <h4 className="font-medium text-sm text-muted-foreground">Custom Claims</h4>

      {/* Add new claim input */}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Enter custom claim text..."
          value={newClaimText}
          onChange={(e) => setNewClaimText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddClaim();
            }
          }}
        />
        <Button onClick={handleAddClaim} type="button">Add Claim</Button>
      </div>

      {/* List of custom claims */}
      <div className="space-y-3">
        {manualClaims.map((claim) => (
          <div key={claim.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
            <Checkbox
              checked={claim.isActive}
              onCheckedChange={(checked) => handleUpdateClaim(claim.id, { isActive: !!checked })}
              id={`checkbox-${claim.id}`}
            />
            {editingClaimId === claim.id ? (
              <Input
                type="text"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") saveEditing(claim.id);
                    if (e.key === "Escape") cancelEditing();
                }}
                className="flex-grow"
              />
            ) : (
              <label htmlFor={`checkbox-${claim.id}`} className="flex-grow text-sm cursor-pointer">
                {claim.text}
              </label>
            )}

            <div className="flex items-center gap-1">
              {editingClaimId === claim.id ? (
                <>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEditing(claim.id)}>
                    <Save className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditing}>
                    <Ban className="h-4 w-4 text-gray-500" />
                  </Button>
                </>
              ) : (
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditing(claim)}>
                  <Edit className="h-4 w-4 text-blue-600" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDeleteClaim(claim.id)}>
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
