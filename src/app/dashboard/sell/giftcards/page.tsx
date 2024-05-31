const page = () => {
  return (
    <div className="animate__animated animate__fadeIn w-full  rounded-xl bg-white p-4">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-xl font-bold">Agregar tarjeta de regalo</h1>
        <button className="font-extraLigth rounded-lg bg-black p-2 text-xs text-white">Publicar</button>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="border rounded-lg p-4 ">
          <h1 className="mb-6 text-xl font-bold">Nueva tarjeta de regalo</h1>
          <form action="">
            <fieldset className="mb-4">
              <legend className="block text-sm font-medium leading-3 text-gray-900">Tienda</legend>
              <div className="mt-2 flex space-x-4 py-1.5">
                <label className="flex cursor-pointer items-center">
                  <input
                    name="giftcard_brand"
                    id="amazon"
                    type="radio"
                    value="amazon"
                    className="h-4 w-4 border-gray-300"
                  />
                  <span className="ml-2 block text-sm font-medium text-gray-700">Amazon</span>
                </label>
                <label className="flex cursor-pointer items-center">
                  <input
                    name="giftcard_brand"
                    id="apple"
                    type="radio"
                    value="apple"
                    className="h-4 w-4 border-gray-300"
                  />
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
                className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 bg-white text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
              >
                <option value="us">United States</option>
                <option value="ca">Canada</option>
                <option value="uk">United Kingdom</option>
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="claimCode" className="block text-sm font-medium leading-3 text-gray-900">
                Código de Canje
              </label>
              <input
                type="text"
                id="claimCode"
                placeholder="Ingresa el código de la tarjeta"
                className="px-2 mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 sm:text-sm sm:leading-6"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="origin" className="block text-sm font-medium leading-3 text-gray-900">
                Procedencia
              </label>
              <select
                name="origin"
                id="origin"
                className="bg-white mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
              >
                <option value="survey">Encuestas</option>
                <option value="study">Estudios</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </form>
        </div>
        <div className="">b</div>
      </div>
    </div>
  );
};

export default page;
