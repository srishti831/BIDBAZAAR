import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useSelector } from "react-redux";

ChartJS.register(CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement, Filler);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const BiddersAuctioneersGraph = () => {
  const { monthlyUsers } = useSelector((s) => s.superAdmin);
  const data = {
    labels: MONTHS,
    datasets: [
      {
        label: "New members",
        data: monthlyUsers,
        borderColor: "#7C5CFF",
        backgroundColor: "rgba(124,92,255,0.18)",
        pointBackgroundColor: "#2EE6A6",
        fill: true,
        tension: 0.35,
      },
    ],
  };
  const options = {
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: "#A3A9D6" }, grid: { color: "#232850" } },
      y: { beginAtZero: true, ticks: { color: "#A3A9D6", precision: 0 }, grid: { color: "#232850" } },
    },
  };
  return <Line data={data} options={options} />;
};

export default BiddersAuctioneersGraph;
