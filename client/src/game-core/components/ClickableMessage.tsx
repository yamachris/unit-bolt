import React from "react";
import styled from "styled-components";

const MessageOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  pointer-events: auto;
`;

const MessageContent = styled.div`
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  pointer-events: none;
`;

interface Props {
  message: string;
  onDismiss: () => void;
}

export const ClickableMessage: React.FC<Props> = ({ message, onDismiss }) => (
  <MessageOverlay onClick={onDismiss}>
    <MessageContent>{message}</MessageContent>
  </MessageOverlay>
);
