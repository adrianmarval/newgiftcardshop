import type { BotRole, Lang } from './types.js';

export const i18n = {
  en: {
    welcome: 'To get started, <b>ENTER YOUR EMAIL ADDRESS:</b>',
    nameShort: '❌ Name too short. Please enter your full name.',
    helloName: '✅ Hello, <b>{name}</b>!\n\n📧 <b>What is your email address?</b>',
    invalidEmail: '❌ Invalid email format.\nExample: <code>user@gmail.com</code>',
    emailInUse: ' That email is already registered.\n\nTo link your Telegram account, we will send a verification code to your email.',
    emailLinkedElsewhere: ' This email is already linked to another Telegram account. Contact the administrator if you need help.',
    emailNotFound: ' No account found with this email. Please register first using /start.',
    otpSent:
      "📬 We sent a 6-digit code to <b>{email}</b>.\n\n🔐 <b>Enter the code:</b>\n\n<i>Code expires in 5 minutes. Check your spam folder if it doesn't arrive.</i>",
    otpSubject: '🔐 Your verification code',
    otpEmailError: '❌ Could not send the code. Please check the email and try again.',
    otpNotFound: '❌ No pending code found. Please enter your email again.',
    otpExpired: '⏰ The code has expired. Please enter your email again to receive a new one.',
    otpIncorrect: '❌ Incorrect code. Please check your email and try again.',
    emailVerified:
      '✅ <b>Email verified!</b>\n\n🔑 <b>Create your password:</b>\n\nRequirements:\n• Minimum 8 characters\n• At least one uppercase\n• At least one lowercase\n• At least one number\n\n<i> Telegram messages are not encrypted. Use a unique password for this account.</i>',
    invalidPassword: '❌ Invalid password. It needs at least:\n• 8 characters\n• 1 uppercase\n• 1 lowercase\n• 1 number',
    sessionIncomplete: '❌ Incomplete session. Start over with /start.',
    accountCreated: `🎉 <b>Account created!</b>\n\nName: <b>{name}</b>\nEmail: <b>{email}</b>\n\n⏳ Your account is <b>awaiting activation</b> by the administrator.\n\n👉 <b>Please contact @${process.env.ADMIN_TELEGRAM_USERNAME} to activate it.</b>`,
    accountLinked: `🎉 <b>Account linked!</b>\n\nWelcome back, <b>{name}</b>!\nYour Telegram is now linked to <b>{email}</b>.\n\n⏳ Awaiting activation by the administrator.\n\n👉 <b>Please contact @${process.env.ADMIN_TELEGRAM_USERNAME} to activate it.</b>`,
    accountLinkedActive:
      '🎉 <b>Account linked!</b>\n\nWelcome back, <b>{name}</b>!\nYour Telegram is now linked to <b>{email}</b>.\n\nYou can now use the bot.',
    contactAdmin: 'Contact Admin',
    linkConfirmation:
      '🔗 <b>Link account</b>\n\nName: <b>{name}</b>\nEmail: <b>{email}</b>\n\nIs this correct?',
    linkConfirm: '✅ Confirm',
    linkCancel: '❌ Cancel',
    linkCancelled: '❌ Link cancelled. You can start again with /start.',
    emailError: '❌ The email is already in use. Contact the administrator.',
    genericError: '❌ Error creating account. Try again or contact the administrator.',
  },
  es: {
    welcome: '👋 ¡Bienvenido!\n\nPara comenzar, por favor ingresa tu correo electrónico.',
    nameShort: '❌ Nombre muy corto. Ingresa tu nombre completo.',
    helloName: '✅ ¡Hola, <b>{name}</b>!\n\n📧 <b>¿Cuál es tu correo electrónico?</b>',
    invalidEmail: '❌ Email inválido. Ingresa un email con formato correcto.\nEjemplo: <code>usuario@gmail.com</code>',
    emailInUse: ' Ese email ya está registrado.\n\nPara vincular tu cuenta de Telegram, te enviamos un código de verificación al correo.',
    emailLinkedElsewhere: ' Este email ya está vinculado a otra cuenta de Telegram. Contacta al administrador si necesitas ayuda.',
    emailNotFound: ' No se encontró cuenta con este email. Por favor, regístrate primero usando /start.',
    otpSent:
      '📬 Te enviamos un código de 6 dígitos a <b>{email}</b>.\n\n🔐 <b>Ingresa el código:</b>\n\n<i>El código expira en 5 minutos. Si no llega, revisa spam.</i>',
    otpSubject: '🔐 Tu código de verificación',
    otpEmailError: '❌ No se pudo enviar el código. Verifica el email e intenta de nuevo.',
    otpNotFound: '❌ No se encontró un código pendiente. Ingresa tu email de nuevo.',
    otpExpired: '⏰ El código expiró. Ingresa tu email de nuevo para recibir uno nuevo.',
    otpIncorrect: '❌ Código incorrecto. Revisa el email e intenta de nuevo.',
    emailVerified:
      '✅ ¡Email verificado!\n\n🔑 Crea tu contraseña:\n\nRequisitos:\n• Mínimo 8 caracteres\n• Al menos una mayúscula\n• Al menos una minúscula\n• Al menos un número\n\n<i> Tus mensajes en Telegram no son cifrados. Usa una contraseña única para esta cuenta.</i>',
    invalidPassword: '❌ Contraseña inválida. Necesita al menos:\n• 8 mayúscula\n• 1 minúscula\n• 1 número',
    sessionIncomplete: '❌ Sesión incompleta. Empieza de nuevo con /start.',
    accountCreated: `🎉 ¡Cuenta creada!\n\nNombre: <b>{name}</b>\nEmail: <b>{email}</b>\n\n⏳ Tu cuenta está pendiente de activación por el administrador.\n\n👉 <b>Por favor, contacta a @${process.env.ADMIN_TELEGRAM_USERNAME} para activarla.</b>`,
    accountLinked: `🎉 <b>¡Cuenta vinculada!</b>\n\n¡Bienvenido de nuevo, <b>{name}</b>!\nTu Telegram ahora está vinculado a <b>{email}</b>.\n\n⏳ Tu cuenta debe ser activada por el administrador.\n\n👉 <b>Por favor, contacta a @${process.env.ADMIN_TELEGRAM_USERNAME} para activarla.</b>`,
    accountLinkedActive:
      '🎉 <b>¡Cuenta vinculada!</b>\n\n¡Bienvenido de nuevo, <b>{name}</b>!\nTu Telegram ahora está vinculado a <b>{email}</b>.',
    contactAdmin: 'Contactar administrador',
    linkConfirmation:
      '🔗 <b>Vincular cuenta</b>\n\nNombre: <b>{name}</b>\nEmail: <b>{email}</b>\n\n¿Es correcto?',
    linkConfirm: '✅ Confirmar',
    linkCancel: '❌ Cancelar',
    linkCancelled: '❌ Vinculación cancelada. Puedes empezar de nuevo con /start.',
    emailError: '❌ El email ya está en uso. Contacta al administrador.',
    genericError: '❌ Error al crear la cuenta. Intenta de nuevo o contacta al administrador.',
  },
};

export function getLang(role: BotRole): Lang {
  return role === 'SELLER' ? 'en' : 'es';
}
