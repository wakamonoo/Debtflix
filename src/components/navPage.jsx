import { MdClose } from "react-icons/md";

export default function NavPage( {hideNavMenu} ) {

  return(
    <div className="top-0 fixed right-0 h-screen w-3/4 bg-blue-700">
      <button onClick={hideNavMenu} className="p-4 text-2xl">
        <MdClose />
      </button>
      <p>succesful navpage</p>
    </div>
  );
}