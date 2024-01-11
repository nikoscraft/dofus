import { Component } from "../types/Gear";

// Basic items like Laine de Bouftou, Fer, should go first because it's a pain to scroll to them
const sheitanItems = [
  "Laine de Bouftou",
  "Fleur de Blop Griotte",
  "Fer",
  "Défense du Sanglier",
  "Bourgeon d'Abraknyde",
  "Fleur de Blop Indigo",
  "Patte d'Arakne",
  "Or",
  "Gelée à la Fraise",
  "Peau de Bworkette",
  "Gelée Bleutée",
  "Gelée à la Menthe",
  "Ambre",
  "Pierre du Craqueleur",
  "Bronze",
  "Champignon",
  "Lamelle de Champa Vert",
  "Lamelle de Champa Marron",
  "Racine d'Abraknyde",
  "Fleur de Blop Reinette",
  "Cuir de Porkass",
  "Charbon",
  "Groin de Sanglier",
  "Gelée Citron",
];
export const isSheitan = (item: Component) => sheitanItems.includes(item.name);
