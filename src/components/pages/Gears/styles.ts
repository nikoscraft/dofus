import styled from "styled-components";
import { Button } from "@mui/material";
export const CraftColumnsGridDimensions = `48px 1fr 80px 80px 120px repeat(2, 80px) repeat(2,60px) 140px repeat(2, 80px) 226px`;

export const StyledGears = styled.div`
  border: solid;
  padding: 1em;
  margin: auto;
`;

export const Header = styled.div`
  margin-bottom: 0.5em;
  display: grid;
  justify-content: center;
  align-items: center;
  grid-template-columns: ${CraftColumnsGridDimensions};
  grid-column-gap: 1em;

  font-weight: bold;
`;

export const Bulker = styled.div`
  margin-bottom: 0.5em;
  display: grid;
  justify-content: center;
  align-items: center;
  grid-template-columns: ${CraftColumnsGridDimensions};
  grid-column-gap: 1em;

  font-weight: bold;

  span {
    text-align: center;
  }
`;

export const ColumnHeader = styled.span`
  cursor: pointer;
`;

export const StyledButton = styled(Button)`
  min-width: 20px !important;
  padding: 0 !important;
`;
