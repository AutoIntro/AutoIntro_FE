import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import { ROUTES } from '../constants/constants';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.wrap}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>페이지를 찾을 수 없습니다.</h1>
      <p className={styles.desc}>요청한 주소가 존재하지 않거나 이동되었을 수 있습니다.</p>
      <Button onClick={() => navigate(ROUTES.HOME)}>홈으로 이동</Button>
    </div>
  );
}
