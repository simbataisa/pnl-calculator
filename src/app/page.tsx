"use client";

import React, { useEffect, useState } from "react";
import { useDataPoints } from "../hooks/useDataPoints";
import * as dfd from "danfojs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import PptxGenJS from "pptxgenjs";
import { Series, Str } from "danfojs";
import {
  App,
  Button,
  Col,
  ConfigProvider,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
  Radio,
  Row,
  Space,
  Table,
  theme,
  Typography,
} from "antd";
import {
  CalendarOutlined,
  DollarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { LayoutType } from "recharts/types/util/types";
import { FormLayout } from "antd/es/form/Form";

const style: React.CSSProperties = { background: "#0092ff", padding: "8px 0" };
const boxStyle: React.CSSProperties = {
  width: "100%",
  height: 120,
  borderRadius: 6,
  border: "1px solid #40a9ff",
};
const { Title, Paragraph, Text, Link } = Typography;

interface DataPoint {
  date: string;
  cost: number;
  revenue: number;
  PnL?: number;
  YtdPnL?: number;
  YoyPnL?: number;
}

interface MonthlyPnL {
  yearMonth: string;
  year: string;
  month: string;
  PnL: number;
}

const columns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
  },
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
  },
  {
    title: "Cost",
    dataIndex: "cost",
    key: "cost",
  },
  {
    title: "Revenue",
    dataIndex: "revenue",
    key: "revenue",
  },
];

// Function to generate 2 years of daily cost and revenue data
const generateData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  const startDate = new Date(
    new Date().setFullYear(new Date().getFullYear() - 2)
  );
  const endDate = new Date();
  let currentDate = startDate;

  while (currentDate <= endDate) {
    data.push({
      date: currentDate.toISOString().split("T")[0],
      cost: Math.floor(Math.random() * 500) + 50, // Random cost between 50 and 550
      revenue: Math.floor(Math.random() * 1000) + 100, // Random revenue between 100 and 1100
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return data;
};

const Home: React.FC = () => {
  const [ytdPnL, setYtdPnL] = useState<number>(0);
  const [yoyPnL, setYoyPnL] = useState<number>(0);
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [monthlyPnL, setMonthlyPnL] = useState<MonthlyPnL[]>([]);

  const { dataPoints, addDataPoint } = useDataPoints();
  const [dpId, setDpId] = useState<string>("");
  const [dpDate, setDpDate] = useState<string>("");
  const [dpCost, setDpCost] = useState<number>(0);
  const [dpRevenue, setDpRevenue] = useState<number>(0);

  // Form
  const [form] = Form.useForm();
  const [formLayout, setFormLayout] = useState<FormLayout | undefined>(
    "vertical"
  );

  const onFormLayoutChange = ({ layout }: { layout: FormLayout }) => {
    setFormLayout(layout);
  };

  const formItemLayout =
    formLayout === "horizontal"
      ? { labelCol: { span: 4 }, wrapperCol: { span: 14 } }
      : null;

  const buttonItemLayout =
    formLayout === "horizontal"
      ? { wrapperCol: { span: 14, offset: 4 } }
      : null;

  useEffect(() => {
    const data = generateData();

    // Creating a DataFrame
    const df = new dfd.DataFrame(data);

    // Convert the date column to datetime format
    dfd.toDateTime(df["date"]);

    // Calculate PnL
    const PnL = df["revenue"].sub(df["cost"]);
    df.addColumn("PnL", PnL, { inplace: true });

    df.print();

    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    // Calculate YTD PnL
    const ytdData = df.loc({ rows: df["date"].dt.year().eq(currentYear) });
    const ytdPnL = ytdData["PnL"].sum() as number;
    setYtdPnL(ytdPnL);

    // Calculate YoY PnL
    const currentYearData = df.loc({
      rows: df["date"].dt.year().eq(currentYear),
    });
    const previousYearData = df.loc({
      rows: df["date"].dt.year().eq(previousYear),
    });

    const currentYearPnL = currentYearData["PnL"].sum() as number;
    const previousYearPnL = previousYearData["PnL"].sum() as number;

    const yoyPnL = currentYearPnL - previousYearPnL;
    setYoyPnL(yoyPnL);

    // Add YTD and YoY PnL to each data point for charting
    const updatedData = dfd.toJSON(df) as DataPoint[];
    const cumulativePnL = { ytd: 0, yoy: 0 };

    updatedData.forEach((item) => {
      const itemDate = new Date(item.date);
      if (itemDate.getFullYear() === currentYear) {
        cumulativePnL.ytd += item.PnL!;
        item.YtdPnL = cumulativePnL.ytd;
      }
      if (
        itemDate.getFullYear() === currentYear ||
        itemDate.getFullYear() === previousYear
      ) {
        cumulativePnL.yoy += item.PnL!;
        item.YoyPnL = cumulativePnL.yoy;
      }
    });

    setChartData(updatedData);

    // Extract year and month from the date column
    df.addColumn("year", df["date"].dt.year(), { inplace: true });
    df.addColumn("month", df["date"].dt.month(), { inplace: true });

    // Group by year and month and sum the PnL
    const grouped = df.groupby(["year", "month"]).agg({ PnL: "sum" });

    const yearStr = new Str(grouped["year"]);

    const monthYearSeries = yearStr
      .concat("-", 1)
      .str.concat(grouped["month"].values, 1);
    console.log("month year series", monthYearSeries);
    grouped.addColumn("yearMonth", monthYearSeries, { inplace: true });

    grouped.print();

    const groupedJson = dfd.toJSON(grouped) as MonthlyPnL[];

    setMonthlyPnL(groupedJson);
  }, []);

  const exportToPptx = () => {
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();

    slide.addText("YTD PnL: " + ytdPnL, { x: 0.5, y: 0.5, fontSize: 18 });
    slide.addText("YoY PnL: " + yoyPnL, { x: 0.5, y: 1, fontSize: 18 });

    // Add chart image to the slide
    const chartElement = document.getElementById("chart");
    if (chartElement) {
      const svg = chartElement.querySelector("svg");
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx!.drawImage(img, 0, 0);
          const imgData = canvas.toDataURL("image/png");
          slide.addImage({ data: imgData, x: 0.5, y: 1.5, w: 9, h: 5 });
          pptx
            .writeFile({ fileName: "PnL_Report" })
            .then((r) => console.log("Done exporting pptx"));
        };
        img.src = "data:image/svg+xml;base64," + btoa(svgData);
      }
    }
  };

  // Function to convert data to JSON and trigger download
  const downloadJSON = (filename: string) => {
    const jsonLinesStr = chartData
      .map((item) => JSON.stringify(item))
      .join("\n");
    const blob = new Blob([jsonLinesStr], { type: "application/jsonl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = () => {
    console.log(dpId, dpDate, dpCost, dpRevenue);
    addDataPoint(dpId, dpDate, dpCost, dpRevenue).then((r) =>
      console.log("Added new data point")
    );
  };

  return (
    <div>
      <ConfigProvider
        theme={{
          // 1. Use dark algorithm
          algorithm: theme.darkAlgorithm,

          // 2. Combine dark algorithm and compact algorithm
          // algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
        }}
      >
        <Flex justify={"center"}>
          <Form
            {...formItemLayout}
            layout={formLayout}
            form={form}
            initialValues={{ layout: formLayout, requiredMarkValue: true }}
            onValuesChange={onFormLayoutChange}
            requiredMark={true}
            style={{ maxWidth: "none" }}
          >
            {/*<Form.Item label="Form Layout" name="layout">
                            <Radio.Group value={formLayout}>
                                <Radio.Button value="horizontal">Horizontal</Radio.Button>
                                <Radio.Button value="vertical">Vertical</Radio.Button>
                                <Radio.Button value="inline">Inline</Radio.Button>
                            </Radio.Group>
                        </Form.Item>*/}
            <Form.Item
              label="Data Point Id"
              required={true}
              rules={[{ required: true }]}
            >
              <Input
                size={"small"}
                placeholder="datapoint id"
                prefix={<UserOutlined />}
                onChange={(e) => setDpId(e.target.value)}
              />
            </Form.Item>
            <Form.Item
              label="Date"
              required={true}
              rules={[{ required: true }]}
            >
              <Input
                size={"small"}
                placeholder="yyyy-mm-dd"
                prefix={<CalendarOutlined />}
                onChange={(e) => setDpDate(e.target.value)}
              />
            </Form.Item>
            <Form.Item
              label="Cost"
              required={true}
              rules={[{ required: true }]}
            >
              <InputNumber
                size={"small"}
                step={10}
                placeholder="100"
                prefix={<DollarOutlined />}
                style={{ width: "100%" }}
                onChange={(value: number) => setDpCost(value)}
              />
            </Form.Item>
            <Form.Item
              label="Revenue"
              required={true}
              rules={[{ required: true }]}
            >
              <InputNumber
                size={"small"}
                step={10}
                placeholder="200"
                prefix={<DollarOutlined />}
                style={{ width: "100%" }}
                onChange={(value: number) => setDpRevenue(value)}
              />
            </Form.Item>
            <Form.Item {...buttonItemLayout}>
              <Button type="primary" onClick={handleSubmit}>
                Submit
              </Button>
            </Form.Item>
          </Form>
        </Flex>
        <Divider orientation="center">Data Point Table</Divider>
        <Row justify={"center"}>
          <Col span={16}>
            <Table
              virtual
              scroll={{ x: 2000, y: 400 }}
              dataSource={dataPoints}
              columns={columns}
            />
          </Col>
        </Row>
        <Row justify={"center"}>
          <Title>PNL Chart</Title>
          <Row justify={"center"}>
            <Col span={8}>
              <Text> YTD PnL: {ytdPnL}</Text>
            </Col>
            <Col span={8}>
              <Text>YoY PnL: {yoyPnL}</Text>
            </Col>
          </Row>
          <Row>
            <Space>
              <Button type={"primary"} onClick={exportToPptx}>
                Export to PPTX
              </Button>
              <Button
                type={"primary"}
                onClick={() => downloadJSON("data.jsonl")}
              >
                Download Chart Data
              </Button>
            </Space>
          </Row>
        </Row>
        <Divider orientation="center">YTD & YoY PnL</Divider>
        <Row justify="center">
          <Col span={16}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="YtdPnL" stroke="#82ca9d" />
                <Line type="monotone" dataKey="YoyPnL" stroke="#ffc658" />
              </LineChart>
            </ResponsiveContainer>
          </Col>
        </Row>
        <Divider orientation="center">Daily PnL</Divider>
        <Row justify="center">
          <Col span={16}>
            <ResponsiveContainer width="100%" height={400} id={"chart"}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="PnL" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </Col>
        </Row>

        <Divider orientation="center">Monthly PNL</Divider>
        <Row justify={"center"}>
          <Col span={16}>
            <ResponsiveContainer width="100%" height={400} id={"monthly-pnl"}>
              <BarChart data={monthlyPnL}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="yearMonth" />
                <YAxis />
                <Tooltip />
                <Legend name={"Monthly PNL"} />
                <Bar type="monotone" dataKey="PnL_sum" stroke="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Col>
        </Row>
      </ConfigProvider>
    </div>
  );
};

export default Home;
