interface LoadingMessageProps {
  message: string;
}

export function LoadingMessage({ message }: LoadingMessageProps) {
  return <p className="flex-1 text-secondary">{message}</p>;
}
