import React from 'react'

function Indicator({value}) {
  return (
    <span className={`w-3 h-3 block rounded-full ${value?'bg-green-600':'bg-red-600'}`}></span>
  )
}

export default Indicator