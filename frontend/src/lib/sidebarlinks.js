import { LayoutDashboard, Play } from 'lucide-react';

export const sidebarLinks = [{
    icons: <LayoutDashboard />,
    route: "/admin",
    label:"Overview"
},{
    icons: <Play />,
    route: "/admin/new",
    label:"Add new Movie"
},{
    icons: <Play />,
    route: "/admin/archive",
    label:"Archive"
}]