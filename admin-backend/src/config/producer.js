var amqp = require('amqplib/callback_api');

 const produceMessage = async (queue, message) => { 
  try {
    // Connect to RabbitMQ server
    const connection = await amqp.connect('amqp://localhost',async (err,connection)=>{
        if(err){
            throw err;
        }
        await connection.createChannel(async (error,channel)=>{
            
            // Ensure the queue exists
            await channel.assertQueue(queue, { durable: true });
        
            // Publish the message to the queue
            channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
        
            console.log(`Message sent to queue "${queue}":`, message);
        });
          // Close the connection after sending the message
    setTimeout(() => {
        connection.close();
      }, 500);
    });


  
  } catch (error) {
    console.error('Error producing message:', error);
  }
};

module.exports= produceMessage;




