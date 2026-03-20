import type { Metadata } from 'next';
import OperatorsHelpClient from './_OperatorsHelpClient';

export const metadata: Metadata = {
  title: 'Инструкция для операторов — TourHab Камчатка',
  description: 'Как разместить туры, принимать бронирования и получать выплаты на платформе TourHab',
};

export default function OperatorsHelpPage() {
  return <OperatorsHelpClient />;
}
