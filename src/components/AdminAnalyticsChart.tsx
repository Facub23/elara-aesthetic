"use client";

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminAnalyticsChart({
  data,
}: {
  data: {
    name: string;
    total: number;
  }[];
}) {

  return (
    <div className="h-[350px] w-full">

      <ResponsiveContainer
        width="100%"
        height="100%"
      >

        <BarChart data={data}>

          <XAxis dataKey="name" />

          <Tooltip />

          <Bar dataKey="total" radius={[12, 12, 0, 0]} />

        </BarChart>

      </ResponsiveContainer>

    </div>
  );
}