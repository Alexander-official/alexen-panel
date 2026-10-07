import { createHashRouter } from "react-router-dom";
import { fetch } from "../service/http";
import { getAuthToken } from "../utils/authStorage";
import { Dashboard, UsersView } from "./Dashboard";
import { SECTIONS, SectionPage } from "./sections";
import { Login } from "./Login";
import { RouteError } from "./RouteError";
const fetchAdminLoader = () => {
    return fetch("/admin", {
        headers: {
            Authorization: `Bearer ${getAuthToken()}`,
        },
    });
};
export const router = createHashRouter([
    {
        path: "/",
        element: <Dashboard />,
        errorElement: <RouteError />,
        loader: fetchAdminLoader,
        children: [
            { index: true, element: <UsersView /> },
            ...SECTIONS.map((section) => ({
                path: section.path,
                element: <SectionPage key={section.path} section={section} />,
            })),
        ],
    },
    {
        path: "/login/",
        element: <Login />,
    },
]);