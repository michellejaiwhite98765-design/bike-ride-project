import { Link } from "react-router-dom";
import { Result, Button } from "antd";

export default function NotFoundPage() {
  return (
    <Result
      status="404"
      title="404"
      subTitle="Sorry, the page you visited does not exist."
      extra={
        <Link to="/">
          <Button type="primary" style={{ background: "#0f766e" }}>
            Back Home
          </Button>
        </Link>
      }
    />
  );
}
