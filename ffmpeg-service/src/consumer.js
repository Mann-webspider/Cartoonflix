import amqp from 'amqplib';

export const consumeMessages = async (queueName, callback) => {
  try {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    await channel.assertQueue(queueName, { durable: true });

    console.log(`Waiting for messages in queue: ${queueName}`);

    channel.consume(queueName, (msg) => {
      callback(msg, channel); // Pass the channel for ack/nack
    });
  } catch (error) {
    console.error('Error in consumer:', error);
  }
};
