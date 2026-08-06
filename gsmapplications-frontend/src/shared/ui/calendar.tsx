import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { es, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const { i18n } = useTranslation()
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={i18n.language?.startsWith('es') ? es : enUS}
      navLayout="around"
      className={cn('p-3', className)}
      classNames={{
        months:      'flex flex-col sm:flex-row gap-2',
        month:       'flex flex-col gap-3 relative',
        month_caption: 'flex justify-center items-center h-8',
        caption_label: 'text-sm font-medium text-foreground',
        button_previous: cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'absolute left-1 top-0 z-10 h-8 w-8 p-0 text-muted-foreground hover:text-foreground'),
        button_next:     cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'absolute right-1 top-0 z-10 h-8 w-8 p-0 text-muted-foreground hover:text-foreground'),
        month_grid:  'w-full border-collapse',
        weekdays:    'flex',
        weekday:     'text-muted-foreground w-8 text-[0.75rem] font-normal',
        week:        'flex w-full mt-1',
        day:         'p-0 text-center text-sm relative',
        day_button:  cn(buttonVariants({ variant: 'ghost' }), 'h-8 w-8 p-0 font-normal rounded-md text-foreground aria-selected:opacity-100'),
        selected:    'bg-primary/10',
        range_start: 'rounded-l-md [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary',
        range_end:   'rounded-r-md [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary',
        range_middle: '[&>button]:bg-transparent [&>button]:text-foreground',
        today:       '[&>button]:border [&>button]:border-primary/40',
        outside:     '[&>button]:text-muted-foreground/60 aria-selected:[&>button]:text-muted-foreground',
        disabled:    '[&>button]:text-muted-foreground/30 [&>button]:pointer-events-none',
        hidden:      'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === 'left' ? <ChevronLeft className="h-4 w-4" {...rest} /> : <ChevronRight className="h-4 w-4" {...rest} />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
