/** One item of a segmented control: a ToggleGroupItem inside a rounded muted track. */
export const segmentItem =
  'min-h-12 rounded-[14px] text-[15px] font-medium text-muted-foreground transition-[background-color,color,box-shadow] duration-150 ' +
  'hover:bg-transparent hover:text-foreground ' +
  'aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-[0_1px_2px_0_rgb(0_0_0/0.08),0_0_0_1px_var(--tile-edge)] ' +
  'dark:aria-pressed:bg-card dark:aria-pressed:shadow-[0_0_0_1px_var(--tile-edge)]'

/** The track the items sit in; add the column count. */
export const segmentTrack = 'grid w-full gap-1 rounded-[18px] bg-muted p-1 dark:bg-muted/60'
