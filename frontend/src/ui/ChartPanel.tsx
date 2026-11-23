import { Table2 } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { ToggleButton } from 'react-aria-components'
import styles from './ChartPanel.module.css'
import { Panel } from './Panel'

export type ChartTable = {
  columns: string[]
  /** One row of text per item; the first cell names the row. */
  rows: string[][]
}

type Props = {
  title: string
  /** Text on the right of the heading, such as the total or the legend. */
  aside?: ReactNode
  /** What the chart shows, in a sentence or two, for screen readers. */
  summary: string
  table: ChartTable
  className?: string
  children: ReactNode
}

/** A panel holding a chart, with a text summary and a "표로 보기" switch that
 * shows the chart's figures as a table instead (DASH-11, A11Y-6). */
export function ChartPanel({ title, aside, summary, table, className, children }: Props) {
  const [asTable, setAsTable] = useState(false)
  const summaryId = useId()
  const toggle = (
    <ToggleButton className={styles.toggle} isSelected={asTable} onChange={setAsTable}>
      <Table2 size={15} aria-hidden="true" />
      표로 보기
    </ToggleButton>
  )
  return (
    <Panel
      title={title}
      aside={
        <span className={styles.aside}>
          {aside}
          {toggle}
        </span>
      }
      className={className}
      aria-describedby={summaryId}
    >
      <p id={summaryId} className="sr-only">
        {summary}
      </p>
      {asTable ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                {table.columns.map((column, index) => (
                  <th key={column} scope="col" className={index > 0 ? styles.number : undefined}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) =>
                    index === 0 ? (
                      <th key={index} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={index} className={styles.number}>
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </Panel>
  )
}
