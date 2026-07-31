"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import Indicator  from "@/components/custom/Indicator"
import {deleteSingleItem} from "@/lib/actioncall"
import { useRouter } from "next/navigation";


export type Movie = {
  _id: string
  title: string
//   status: "pending" | "processing" | "success" | "failed"
isReady:boolean,
isPublish:boolean
type: string,
}

export const columns: ColumnDef<Movie>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "_id",
    header: "MovieId",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("_id")}</div>
    ),
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="lowercase">{row.getValue("title")}</div>,
  },
  {
    accessorKey: "isReady",
    header: () => <div className="text-left">isReady</div>,
    cell: ({ row }) => <div className="lowercase text-center ">{ <Indicator value={row.getValue("isReady")}/>}</div>,
  },
  {
    accessorKey: "isPublish",
    header: () => <div className="text-left">IsPublish</div>,
    cell: ({ row }) => <div className="lowercase text-center ">{ <Indicator value={row.getValue("isPublish")}/>}</div>,
  },
  {
    accessorKey: "type",
    header: () => <div className="text-right">Media</div>,
    cell: ({ row }) => {
      const mediaType:string = row.getValue("type")
      return <div className="text-right font-medium">{mediaType}</div>
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const movie = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(movie._id)}
            >
              Copy movie ID
            </DropdownMenuItem>
            {/* <DropdownMenuSeparator /> */}
            <DropdownMenuItem>View</DropdownMenuItem>
            <DropdownMenuItem onClick={()=> location.href=`/admin/edit/${movie._id}`}>Edit</DropdownMenuItem>
            <DropdownMenuItem className="bg-red-500 text-white font-bold" onClick={()=> deleteSingleItem(movie._id)}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
] 

export function DataTableDemo({data}:{data:Movie[]}) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>([])

  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
    
      rowSelection,
    },
  })

  function deleteMultipleItems(){
    let deleteItemList = table.getRowModel().rows?.filter((row)=>row.getIsSelected())?.map((row)=> row.original._id)
    if(deleteItemList.length == 0){
      alert("Please select movie then try to delete")
      return;
    }
    let res = prompt(`Are you sure you want to delete ${deleteItemList}? yes or no`);
    if(res == "yes" || res == "y"){
      for (let index = 0; index < deleteItemList.length; index++) {
        deleteSingleItem(deleteItemList[index]);
        
      }
      console.log(deleteItemList)
    }
    else if(res == "no" || res == "n"){
      console.log("not deleted  ")
    }
    else{
      console.log("invalid prompt")
    }
    
  }

  

  return (
    <div className="w-full">
      <div className="flex items-center py-4 justify-between">
        <Input
          placeholder="Filter title..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex gap-5">
        <Link href={"/admin/new"}><Button className="px-6" >Add Movie</Button></Link>
        <Button className="px-6 bg-red-500" onClick={deleteMultipleItems}>Delete</Button>
          </div>
        
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
