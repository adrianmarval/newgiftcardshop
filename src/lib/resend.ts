import { Resend } from 'resend';

// Instanciación LAZY: `next build` importa este módulo al recolectar page data de las
// rutas, y ahí RESEND_API_KEY no existe (es runtime-only). El constructor de Resend
// explota sin key, así que diferimos la creación al primer uso real (runtime).
let client: Resend | null = null;

export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    client ??= new Resend(process.env.RESEND_API_KEY);
    // Sin receiver: getters/métodos del cliente real conservan su `this`
    // (el proxy rompería el acceso a campos privados de la clase).
    return Reflect.get(client, prop);
  },
});

export const EMAIL_FROM = `${process.env.EMAIL_FROM_NAME || 'GiftCardShop'} <${process.env.EMAIL_FROM_ADDRESS || 'onboarding@giftcardshop.app'}>`;
