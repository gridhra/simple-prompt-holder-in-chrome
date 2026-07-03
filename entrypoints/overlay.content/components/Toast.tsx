interface ToastProps {
  message: string;
  type: 'success' | 'error';
}

export default function Toast({ message, type }: ToastProps) {
  return <div className={`sph-toast sph-toast--${type}`}>{message}</div>;
}
