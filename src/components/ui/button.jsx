import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-light transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#2D2D2D] text-white shadow-none hover:bg-[#3D3D3D]",
        destructive:
          "bg-red-50 text-red-600 shadow-none hover:bg-red-100",
        outline:
          "border border-[#E8E5E0] bg-transparent shadow-none hover:bg-[#FAF7F2] hover:border-[#2D2D2D]",
        secondary:
          "bg-[#E8E5E0] text-[#6E6761] shadow-none hover:bg-[#E8E5E0]",
        ghost: "hover:bg-[#FAF7F2] text-[#2D2D2D]",
        link: "text-[#2D2D2D] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }