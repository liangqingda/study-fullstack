import { Button } from '@mantine/core';
import { IconArrowBackUp } from '@tabler/icons-react';
import { useNavigate } from 'react-router';

import ResultView from '@/pages/Errors/components/ResultView';
import { defaultRoutePath } from '@/generated/routes';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <ResultView
      action={
        <Button
          leftSection={<IconArrowBackUp size={18} stroke={1.8} />}
          onClick={() => navigate(defaultRoutePath)}
          type="button"
        >
          返回默认 Demo
        </Button>
      }
      status="404"
      subTitle="当前地址没有匹配到 demo 页面。"
      title="页面不存在"
    />
  );
};

export default NotFound;
