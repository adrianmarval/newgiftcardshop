import { addGiftcard } from '@/offers/giftcards/actions/giftcards-actions';

export const GiftCardForm = async () => {
  return (
    <form action={addGiftcard}>
      <fieldset className="mb-4">
        <legend className="block text-sm font-medium leading-3 text-gray-900">Tienda</legend>
        <div className="mt-2 flex space-x-4 py-1.5">
          <label className="flex cursor-pointer items-center">
            <input name="store" id="amazon" type="radio" value="amazon" className="h-4 w-4 border-gray-300" />
            <span className="ml-2 block text-sm font-medium text-gray-700">Amazon</span>
          </label>
          <label className="flex cursor-pointer items-center">
            <input name="store" id="apple" type="radio" value="apple" className="h-4 w-4 border-gray-300" />
            <span className="ml-2 block text-sm font-medium text-gray-700">Apple</span>
          </label>
        </div>
      </fieldset>

      <div className="mb-4">
        <label htmlFor="country" className="block text-sm font-medium leading-3 text-gray-900">
          País
        </label>
        <select
          name="country"
          id="country"
          className="mt-2 block w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
        >
          <option value="us">United States</option>
          <option value="ca">Canada</option>
          <option value="uk">United Kingdom</option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="origin" className="block text-sm font-medium leading-3 text-gray-900">
          Procedencia
        </label>
        <select
          name="origin"
          id="origin"
          className="mt-2 block w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
        >
          <option value="survey">Encuestas</option>
          <option value="study">Estudios</option>
          <option value="other">Otro</option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="claimCode" className="block text-sm font-medium leading-3 text-gray-900">
          Monto
        </label>
        <input
          type="number"
          step="0.01"
          id="amount"
          name="amount"
          placeholder="Ingresa el monto"
          className="mt-2 block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 sm:text-sm sm:leading-6"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="claimCode" className="block text-sm font-medium leading-3 text-gray-900">
          Código de Canje
        </label>
        <input
          type="text"
          id="claimCode"
          name="claimCode"
          placeholder="Ingresa el código de la tarjeta"
          className="mt-2 block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 sm:text-sm sm:leading-6"
        />
      </div>
      <button type="submit" className="font-extraLigth rounded-lg bg-black px-4 py-2 text-xs text-white ">
        Agregar tarjeta
      </button>
    </form>
  );
};
