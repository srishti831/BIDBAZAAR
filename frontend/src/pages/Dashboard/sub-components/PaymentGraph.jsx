import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useSelector } from "react-redux";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PaymentGraph = () => {
  const { monthlyRevenue } = useSelector((s) => s.superAdmin);
  const data = {
    labels: MONTHS,
    datasets: [
      { label: "Commission received (₹)", data: monthlyRevenue, backgroundColor: "#FFC857", borderRadius: 6 },
    ],
  };
  const options = {
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: "#A3A9D6" }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: "#A3A9D6" }, grid: { color: "#232850" } },
    },
  };
  return <Bar data={data} options={options} />;
};

export default PaymentGraph;
