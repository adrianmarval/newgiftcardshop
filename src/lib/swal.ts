import Swal from 'sweetalert2';

export const showSwal = Swal.mixin({
  customClass: {
    popup: 'bg-card border border-border text-foreground rounded-2xl shadow-2xl backdrop-blur-sm',
    title: 'text-foreground font-bold',
    htmlContainer: 'text-muted-foreground',
    confirmButton:
      'bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-primary/20',
    cancelButton: 'bg-muted text-muted-foreground hover:bg-muted/80 px-6 py-2 rounded-xl font-bold transition-all',
  },
  buttonsStyling: false,
  background: '#171717',
  color: 'inherit',
});

// Toast mixin for small notifications
const toastSwal = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: 'oklch(var(--card))',
  color: 'oklch(var(--foreground))',
  customClass: {
    popup: 'border border-border rounded-xl shadow-xl backdrop-blur-md',
  },
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

export const showAlert = {
  success: (title: string, text?: string) => showSwal.fire({ icon: 'success', title, text }),

  error: (title: string, text?: string) => showSwal.fire({ icon: 'error', title, text }),

  warning: (title: string, text?: string) => showSwal.fire({ icon: 'warning', title, text }),

  info: (title: string, text?: string) => showSwal.fire({ icon: 'info', title, text }),

  confirm: async (title: string, text: string) => {
    const result = await showSwal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    });
    return result.isConfirmed;
  },

  // Toast methods
  toast: {
    success: (title: string, text?: string) => toastSwal.fire({ icon: 'success', title, text }),
    error: (title: string, text?: string) => toastSwal.fire({ icon: 'error', title, text }),
    warning: (title: string, text?: string) => toastSwal.fire({ icon: 'warning', title, text }),
    info: (title: string, text?: string) => toastSwal.fire({ icon: 'info', title, text }),
  },
};
