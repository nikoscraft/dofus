import { Component } from "../../../types/Gear";

type RecipeFormProps = {
  recipe: Component[];
  onClose: () => void;
  onNameUpdate: (item: Component, newName: string) => void;
  onComponentQuantityUpdate: (item: Component, newQuantity: number) => void;
  name: string;
  deleteGear: (name: string) => void;
  onComponentAdd: (name: string, quantity?: number) => void;
};

type RecipeFormDisplayProps = RecipeFormProps;
export type { RecipeFormDisplayProps, RecipeFormProps };
