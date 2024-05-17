import Link from "next/link";

const page = () => {
  return (
    <div className="animate__animated animate__fadeIn">
      <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow sm:p-6 xl:p-8  2xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold leading-none text-gray-900 sm:text-3xl">
                $45,385
              </span>
              <h3 className="text-base font-normal text-gray-500">
                Sales this week
              </h3>
            </div>
            <div className="flex flex-1 items-center justify-end text-base font-bold text-green-500">
              12.5%
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </div>
          </div>
          <div id="main-chart"></div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow sm:p-6 xl:p-8 ">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">
                Latest Transactions
              </h3>
              <span className="text-base font-normal text-gray-500">
                This is a list of latest transactions
              </span>
            </div>
            <div className="flex-shrink-0">
              <Link
                href="#"
                className="rounded-lg p-2 text-sm font-medium text-cyan-600 hover:bg-gray-100"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="mt-8 flex flex-col">
            <div className="overflow-x-auto rounded-lg">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden shadow sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="p-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Transaction
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Date & Time
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr>
                        <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-900">
                          Payment from{" "}
                          <span className="font-semibold">Bonnie Green</span>
                        </td>
                        <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-500">
                          Apr 23 ,2021
                        </td>
                        <td className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900">
                          $2300
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="rounded-left whitespace-nowrap rounded-lg p-4 text-sm font-normal text-gray-900">
                          Payment refund to{" "}
                          <span className="font-semibold">#00910</span>
                        </td>
                        <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-500">
                          Apr 23 ,2021
                        </td>
                        <td className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900">
                          -$670
                        </td>
                      </tr>
                      <tr>
                        <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-900">
                          Payment failed from{" "}
                          <span className="font-semibold">#087651</span>
                        </td>
                        <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-500">
                          Apr 18 ,2021
                        </td>
                        <td className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900">
                          $234
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="rounded-left whitespace-nowrap rounded-lg p-4 text-sm font-normal text-gray-900">
                          Payment from{" "}
                          <span className="font-semibold">Lana Byrd</span>
                        </td>
                        <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-500">
                          Apr 15 ,2021
                        </td>
                        <td className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900">
                          $5000
                        </td>
                      </tr>
                      <tr>
                        <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-900">
                          Payment from{" "}
                          <span className="font-semibold">Jese Leos</span>
                        </td>
                        <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-500">
                          Apr 15 ,2021
                        </td>
                        <td className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900">
                          $2300
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="rounded-left whitespace-nowrap rounded-lg p-4 text-sm font-normal text-gray-900">
                          Payment from{" "}
                          <span className="font-semibold">THEMESBERG LLC</span>
                        </td>
                        <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-500">
                          Apr 11 ,2021
                        </td>
                        <td className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900">
                          $560
                        </td>
                      </tr>
                      <tr>
                        <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-900">
                          Payment from{" "}
                          <span className="font-semibold">Lana Lysle</span>
                        </td>
                        <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-500">
                          Apr 6 ,2021
                        </td>
                        <td className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900">
                          $1437
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow sm:p-6 xl:p-8 ">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold leading-none text-gray-900 sm:text-3xl">
                2,340
              </span>
              <h3 className="text-base font-normal text-gray-500">
                New products this week
              </h3>
            </div>
            <div className="ml-5 flex w-0 flex-1 items-center justify-end text-base font-bold text-green-500">
              14.6%
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow sm:p-6 xl:p-8 ">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold leading-none text-gray-900 sm:text-3xl">
                5,355
              </span>
              <h3 className="text-base font-normal text-gray-500">
                Visitors this week
              </h3>
            </div>
            <div className="ml-5 flex w-0 flex-1 items-center justify-end text-base font-bold text-green-500">
              32.9%
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow sm:p-6 xl:p-8 ">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold leading-none text-gray-900 sm:text-3xl">
                385
              </span>
              <h3 className="text-base font-normal text-gray-500">
                User signups this week
              </h3>
            </div>
            <div className="ml-5 flex w-0 flex-1 items-center justify-end text-base font-bold text-red-500">
              -2.7%
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default page;
